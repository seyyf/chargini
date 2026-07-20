alter table public.profiles enable row level security;
alter table public.chargers enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

-- Profiles: anyone can read; a user can update only their own.
create policy "profiles readable" on public.profiles
  for select using (true);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- Chargers: anyone reads active ones (owner reads their own too); owner writes.
create policy "chargers readable" on public.chargers
  for select using (is_active or auth.uid() = host_id);
create policy "chargers owner insert" on public.chargers
  for insert with check (auth.uid() = host_id);
create policy "chargers owner update" on public.chargers
  for update using (auth.uid() = host_id);
create policy "chargers owner delete" on public.chargers
  for delete using (auth.uid() = host_id);

-- Availability: readable by all; writable by the charger's host.
create policy "availability readable" on public.availability_rules
  for select using (true);
create policy "availability owner write" on public.availability_rules
  for all using (
    exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  );

-- Bookings: driver or the charger's host can read; driver inserts; host or driver updates status.
create policy "bookings participant read" on public.bookings
  for select using (
    auth.uid() = driver_id
    or exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  );
create policy "bookings driver insert" on public.bookings
  for insert with check (auth.uid() = driver_id);
create policy "bookings participant update" on public.bookings
  for update using (
    auth.uid() = driver_id
    or exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  );

-- Reviews: anyone reads; only a participant of a completed booking writes.
create policy "reviews readable" on public.reviews
  for select using (true);
create policy "reviews participant insert" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (b.driver_id = auth.uid()
          or exists (
            select 1 from public.chargers c
            where c.id = b.charger_id and c.host_id = auth.uid()
          ))
    )
  );
