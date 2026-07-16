-- Enums
create type connector_type as enum ('type2', 'type1', 'ccs', 'chademo', 'schuko');
create type price_unit as enum ('kwh', 'hour');
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  phone text,
  is_verified boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Chargers (listings)
create table public.chargers (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  address text not null,
  lat double precision not null,
  lng double precision not null,
  city text not null,
  connector_type connector_type not null,
  power_kw numeric(5,1) not null,
  price_amount numeric(8,3) not null,
  price_unit price_unit not null,
  photos text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index chargers_city_idx on public.chargers (city);
create index chargers_active_idx on public.chargers (is_active);

-- Availability rules (weekly)
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  charger_id uuid not null references public.chargers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index availability_charger_idx on public.availability_rules (charger_id);

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  charger_id uuid not null references public.chargers(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  total_price numeric(10,3) not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index bookings_charger_idx on public.bookings (charger_id);
create index bookings_driver_idx on public.bookings (driver_id);

-- Reviews (one per booking per reviewer)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

-- Auto-create a profile row when a new auth user is created
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
