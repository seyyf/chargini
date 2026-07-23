-- 0004_notifications.sql
--
-- In-app notifications. A notification is created automatically (via SECURITY
-- DEFINER triggers) when a booking is requested or its status changes. Clients
-- never insert notifications directly; they may only read their own and mark
-- them read.
--
-- Append-only migration: safe to run once against the live schema.

set search_path = public;

-- Notification kinds.
create type notification_type as enum (
  'booking_requested',
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx
  on public.notifications (user_id, is_read, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

-- Recipient can read their own notifications.
create policy "notifications owner read" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

-- Recipient can delete their own notifications.
create policy "notifications owner delete" on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

-- Recipient may update their own — but only the is_read column (column grant).
create policy "notifications owner update" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- No INSERT policy: only the SECURITY DEFINER triggers below create rows.

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- A new pending booking notifies the charger's host.
create or replace function public.notify_booking_requested()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_host uuid;
begin
  if new.status <> 'pending' then
    return new; -- seeded/admin bookings inserted in other states: no request notice
  end if;
  select c.host_id into v_host
  from public.chargers c
  where c.id = new.charger_id;
  if v_host is not null then
    insert into public.notifications (user_id, type, booking_id)
    values (v_host, 'booking_requested', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_requested on public.bookings;
create trigger on_booking_requested
  after insert on public.bookings
  for each row execute function public.notify_booking_requested();

-- A status change notifies the OTHER participant (the one who didn't act).
create or replace function public.notify_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_host uuid;
  v_actor uuid := auth.uid();
  v_recipient uuid;
  v_type public.notification_type;
begin
  if new.status = old.status then
    return new;
  end if;

  select c.host_id into v_host
  from public.chargers c
  where c.id = new.charger_id;

  -- Recipient is the participant who did not make the change. When there is no
  -- end-user actor (service role), default to notifying the driver.
  if v_actor = new.driver_id then
    v_recipient := v_host;
  else
    v_recipient := new.driver_id;
  end if;

  v_type := case new.status
    when 'confirmed' then 'booking_confirmed'::public.notification_type
    when 'completed' then 'booking_completed'::public.notification_type
    when 'cancelled' then 'booking_cancelled'::public.notification_type
    else null
  end;

  if v_type is not null and v_recipient is not null then
    insert into public.notifications (user_id, type, booking_id)
    values (v_recipient, v_type, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_booking_status on public.bookings;
create trigger on_booking_status
  after update of status on public.bookings
  for each row execute function public.notify_booking_status();
