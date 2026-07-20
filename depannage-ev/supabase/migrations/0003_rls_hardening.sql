-- 0003_rls_hardening.sql
--
-- Security hardening following the Phase 1 review. Migrations are append-only:
-- 0001_init.sql and 0002_rls.sql are already applied to the live database, so
-- everything here is expressed as ALTER / DROP+CREATE and is safe to run once
-- against that schema (and, thanks to the `if not exists` guards, re-runnable).
--
-- NOTE ON COLUMN-LEVEL GRANTS (sections 1 and 4): once `public.profiles` has
-- column-level SELECT privileges, `select *` (which is supabase-js's default
-- when you call `.select()` with no argument) will fail with "permission denied
-- for table profiles" for anon/authenticated. Always name the columns you want
-- when querying profiles from the browser.
--
-- PHASE 2 WARNING: `select('*')` / a bare `.select()` on `profiles` will fail
-- with "permission denied for table profiles" for anon/authenticated — always
-- name explicit columns. When host profile pages are built, consider a
-- `profiles_public` view (security_invoker) instead of hand-listing columns.

set search_path = public, extensions;

--------------------------------------------------------------------------------
-- 1. CRITICAL: profiles privilege escalation.
--
-- RLS is row-level, not column-level, and Supabase grants UPDATE on every public
-- table to `authenticated`. The "profiles self update" policy therefore let any
-- signed-in user flip is_verified/rating_avg/rating_count on their own row and
-- self-promote to a verified 5-star host. Trust fields become server-only; the
-- seed script keeps working because the service-role key bypasses both RLS and
-- these grants.
--------------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, bio, phone)
  on public.profiles to authenticated;

--------------------------------------------------------------------------------
-- 4. IMPORTANT: phone numbers were world-readable.
--
-- "profiles readable" is `using (true)` and the table holds `phone`, so anyone
-- with the publishable key could dump every user's phone number. Drop the
-- table-wide SELECT and grant only the genuinely public columns. A later phase
-- can expose `phone` to confirmed booking counterparties through a view or an
-- RPC rather than a blanket grant.
--------------------------------------------------------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (
  id, full_name, avatar_url, bio, is_verified, rating_avg, rating_count, created_at
) on public.profiles to anon, authenticated;

--------------------------------------------------------------------------------
-- 2a. CRITICAL: a driver could self-confirm a booking.
--
-- "bookings driver insert" only checked `auth.uid() = driver_id`, so a driver
-- could POST `status: 'confirmed'` and skip the host's accept/decline entirely,
-- which defeats the request-to-book model. Force new bookings to start as
-- 'pending' on a charger that exists and is active.
--------------------------------------------------------------------------------
drop policy if exists "bookings driver insert" on public.bookings;
create policy "bookings driver insert" on public.bookings
  for insert to authenticated
  with check (
    auth.uid() = driver_id
    and status = 'pending'
    and exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.is_active
    )
  );

--------------------------------------------------------------------------------
-- 2b. CRITICAL: total_price was whatever the client sent.
--
-- Recompute it server-side on every insert from the charger's own pricing, so a
-- client-supplied 0 is simply overwritten. The rule must stay in step with
-- src/lib/pricing.ts:
--   hour -> price_amount * hours
--   kwh  -> price_amount * power_kw * hours
-- rounded to 3 decimals to match numeric(10,3).
--
-- SECURITY DEFINER so the lookup sees the charger regardless of the caller's RLS
-- visibility; `search_path = ''` forces every identifier to be qualified.
-- auth.uid() still reflects the request's JWT inside a definer function, because
-- it reads a per-request GUC rather than the session user.
--------------------------------------------------------------------------------
create or replace function public.bookings_set_total_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charger public.chargers%rowtype;
  v_hours numeric;
begin
  select * into v_charger
  from public.chargers c
  where c.id = new.charger_id;

  if not found then
    raise exception 'Charger % does not exist', new.charger_id;
  end if;

  if new.end_time <= new.start_time then
    raise exception 'Booking end_time must be after start_time';
  end if;

  v_hours := extract(epoch from (new.end_time - new.start_time)) / 3600;

  if v_charger.price_unit = 'hour' then
    new.total_price := round(v_charger.price_amount * v_hours, 3);
  else
    new.total_price := round(v_charger.price_amount * v_charger.power_kw * v_hours, 3);
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_set_total_price on public.bookings;
create trigger bookings_set_total_price
  before insert on public.bookings
  for each row execute function public.bookings_set_total_price();

--------------------------------------------------------------------------------
-- 2c. CRITICAL: bookings were freely mutable after creation.
--
-- The update policy has no WITH CHECK beyond its USING clause, so either
-- participant could rewrite the price, the times or the charger. Enforce
-- immutability plus a legal status state machine:
--   host:   pending->confirmed, pending->cancelled,
--           confirmed->completed, confirmed->cancelled
--   driver: pending->cancelled, confirmed->cancelled
--
-- When auth.uid() is null there is no end-user JWT, which means the caller is a
-- trusted server context (service_role key or the SQL editor); those already
-- bypass RLS wholesale, so the guard steps aside for them. Anonymous callers
-- never reach this trigger: the update policy requires auth.uid() to match a
-- participant, and null matches nobody.
--------------------------------------------------------------------------------
create or replace function public.bookings_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
begin
  if v_uid is null then
    return new;
  end if;

  -- id and created_at are not in the review's list but are just as immutable.
  if new.id is distinct from old.id
     or new.charger_id is distinct from old.charger_id
     or new.driver_id is distinct from old.driver_id
     or new.total_price is distinct from old.total_price
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the status of a booking may be changed';
  end if;

  if new.status = old.status then
    return new;
  end if;

  select c.host_id into v_host
  from public.chargers c
  where c.id = old.charger_id;

  -- Host first: if a host books their own charger they get the wider rights.
  if v_uid = v_host then
    if (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
       or (old.status = 'confirmed' and new.status in ('completed', 'cancelled')) then
      return new;
    end if;
  elsif v_uid = old.driver_id then
    if old.status in ('pending', 'confirmed') and new.status = 'cancelled' then
      return new;
    end if;
  end if;

  raise exception 'Illegal booking status transition: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists bookings_guard_update on public.bookings;
create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function public.bookings_guard_update();

--------------------------------------------------------------------------------
-- 3. IMPORTANT: review bombing through an unconstrained reviewee_id.
--
-- The old policy proved the reviewer took part in a completed booking but never
-- checked who was being reviewed, so any profile id could be targeted. Pin
-- reviewee_id to the actual counterparty of that booking.
--------------------------------------------------------------------------------
drop policy if exists "reviews participant insert" on public.reviews;
create policy "reviews participant insert" on public.reviews
  for insert to authenticated
  with check (
    auth.uid() = reviewer_id
    and reviewee_id <> auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (
          b.driver_id = auth.uid()
          or exists (
            select 1 from public.chargers c
            where c.id = b.charger_id and c.host_id = auth.uid()
          )
        )
        and reviewee_id = case
              when b.driver_id = auth.uid()
                then (select c.host_id from public.chargers c where c.id = b.charger_id)
              else b.driver_id
            end
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_no_self' and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_no_self check (reviewer_id <> reviewee_id);
  end if;
end $$;

--------------------------------------------------------------------------------
-- 5. Double-booking prevention.
--
-- Nothing stopped two overlapping bookings on the same charger. Only pending and
-- confirmed bookings hold a slot; cancelled and completed ones release it. The
-- seeded bookings are 'completed' and sit on two different chargers, so no
-- existing row conflicts and the constraint validates cleanly.
--------------------------------------------------------------------------------
create extension if not exists btree_gist with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_no_overlap' and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_no_overlap
      exclude using gist (
        charger_id with =,
        tstzrange(start_time, end_time) with &&
      ) where (status in ('pending', 'confirmed'));
  end if;
end $$;

--------------------------------------------------------------------------------
-- 6. handle_new_user must be idempotent.
--
-- A pre-existing profile row made the trigger raise, which aborted the whole
-- auth signup. Swallow the conflict, and tighten to search_path = '' (which is
-- why every identifier below is fully qualified).
--------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

--------------------------------------------------------------------------------
-- 7. Missing indexes on columns the policies and listing pages filter by.
--------------------------------------------------------------------------------
create index if not exists chargers_host_idx on public.chargers (host_id);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);
