
-- Enums
create type aircraft_status as enum ('In-Flight','On-Ground','AOG','Maintenance','Delayed','Standby');
create type crew_status as enum ('On-Duty','Off-Duty','On-Leave','Fatigue-Hold','In-Flight');
create type cargo_status as enum ('Loaded','In-Transit','Delayed','Offloaded','Held-Customs');
create type work_order_status as enum ('Open','In-Progress','Pending-Parts','Completed','Escalated');
create type app_role as enum ('admin','dispatcher','crew','maintenance');

-- Aircraft
create table public.aircraft (
  id uuid primary key default gen_random_uuid(),
  tail_number text unique not null,
  model text not null,
  airline text not null,
  base_airport text not null,
  current_airport text,
  status aircraft_status not null default 'On-Ground',
  health_score numeric(5,2) not null default 100.0,
  flight_hours_total integer not null default 0,
  next_maintenance_due timestamptz,
  fuel_capacity_kg numeric,
  current_fuel_kg numeric,
  last_updated timestamptz not null default now(),
  metadata jsonb
);

-- Flights
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  flight_number text not null,
  aircraft_id uuid references public.aircraft(id) on delete set null,
  origin_icao text not null,
  destination_icao text not null,
  scheduled_departure timestamptz not null,
  actual_departure timestamptz,
  scheduled_arrival timestamptz not null,
  actual_arrival timestamptz,
  status text not null default 'Scheduled',
  delay_reason text,
  fuel_planned_kg numeric,
  fuel_actual_kg numeric,
  route_waypoints jsonb,
  created_at timestamptz not null default now()
);

-- Crew
create table public.crew (
  id uuid primary key default gen_random_uuid(),
  employee_id text unique not null,
  full_name text not null,
  role text not null,
  certifications text[] not null default '{}',
  base_airport text not null,
  status crew_status not null default 'Off-Duty',
  duty_time_remaining_hrs numeric not null default 8.0,
  rest_period_end timestamptz,
  current_assignment uuid references public.flights(id) on delete set null,
  total_flight_hours integer not null default 0,
  last_updated timestamptz not null default now()
);

-- Maintenance
create table public.maintenance (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid references public.aircraft(id) on delete cascade,
  work_order_number text unique not null,
  title text not null,
  description text,
  status work_order_status not null default 'Open',
  priority text not null default 'Normal',
  triggered_by text not null default 'Manual',
  assigned_team text,
  parts_required jsonb,
  estimated_hours numeric,
  actual_hours numeric,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

-- Cargo
create table public.cargo (
  id uuid primary key default gen_random_uuid(),
  awb_number text unique not null,
  flight_id uuid references public.flights(id) on delete set null,
  shipper text not null,
  consignee text not null,
  origin_icao text not null,
  destination_icao text not null,
  weight_kg numeric not null,
  commodity_type text,
  status cargo_status not null default 'Loaded',
  delay_notified boolean not null default false,
  special_handling text[] not null default '{}',
  last_updated timestamptz not null default now()
);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null default 'Medium',
  source_table text not null,
  source_id uuid not null,
  title text not null,
  body text not null,
  acknowledged boolean not null default false,
  acknowledged_by uuid,
  created_at timestamptz not null default now()
);

-- User roles (separate table)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-grant dispatcher role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'dispatcher')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.aircraft enable row level security;
alter table public.flights enable row level security;
alter table public.crew enable row level security;
alter table public.maintenance enable row level security;
alter table public.cargo enable row level security;
alter table public.alerts enable row level security;
alter table public.user_roles enable row level security;

-- RLS policies — authenticated read all ops data
create policy "ops read aircraft" on public.aircraft for select to authenticated using (true);
create policy "ops read flights" on public.flights for select to authenticated using (true);
create policy "ops read crew" on public.crew for select to authenticated using (true);
create policy "ops read maintenance" on public.maintenance for select to authenticated using (true);
create policy "ops read cargo" on public.cargo for select to authenticated using (true);
create policy "ops read alerts" on public.alerts for select to authenticated using (true);

-- Write policies (admin or dispatcher for most; maintenance role for maintenance table)
create policy "dispatcher write aircraft" on public.aircraft for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'));

create policy "dispatcher write flights" on public.flights for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'));

create policy "dispatcher write crew" on public.crew for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'));

create policy "maint write maintenance" on public.maintenance for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'maintenance') or public.has_role(auth.uid(),'dispatcher'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'maintenance') or public.has_role(auth.uid(),'dispatcher'));

create policy "dispatcher write cargo" on public.cargo for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher'));

create policy "auth write alerts" on public.alerts for all to authenticated
  using (true) with check (true);

-- user_roles policies
create policy "view own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Realtime
alter publication supabase_realtime add table public.aircraft;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.flights;
alter publication supabase_realtime add table public.crew;
alter table public.aircraft replica identity full;
alter table public.alerts replica identity full;
alter table public.flights replica identity full;
alter table public.crew replica identity full;
