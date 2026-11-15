create type public.app_role as enum ('admin', 'volunteer', 'veterinarian', 'ngo');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  legacy_id text unique,
  display_name text not null,
  role public.app_role not null,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ngos (
  id text primary key,
  legacy_id text unique,
  name text,
  email text,
  phone text,
  area text,
  status text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dogs (
  id text primary key,
  legacy_id text unique,
  sdht_id text,
  name text,
  sex text,
  breed text,
  estimated_birth_date date,
  color text,
  current_location text,
  latitude double precision,
  longitude double precision,
  health_status text,
  status text,
  photo_path text,
  created_by uuid references public.profiles (id) on delete set null,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.volunteers (
  id text primary key,
  legacy_id text unique,
  profile_id uuid references public.profiles (id) on delete set null,
  ngo_id text references public.ngos (id) on delete set null,
  area text,
  status text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.veterinarians (
  id text primary key,
  legacy_id text unique,
  profile_id uuid references public.profiles (id) on delete set null,
  license_number text,
  specialty text,
  clinic_name text,
  status text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_records (
  id text primary key,
  legacy_id text unique,
  dog_id text references public.dogs (id) on delete set null,
  record_type text,
  observed_at timestamptz,
  diagnosis text,
  symptoms text[] not null default '{}',
  severity text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rescue_cases (
  id text primary key,
  legacy_id text unique,
  dog_id text references public.dogs (id) on delete set null,
  reported_by uuid references public.profiles (id) on delete set null,
  assigned_volunteer_id text references public.volunteers (id) on delete set null,
  ngo_id text references public.ngos (id) on delete set null,
  status text not null default 'open',
  severity text,
  title text,
  description text,
  location text,
  latitude double precision,
  longitude double precision,
  resolved_at timestamptz,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vaccinations (
  id text primary key,
  legacy_id text unique,
  dog_id text references public.dogs (id) on delete set null,
  vaccine_name text,
  administered_at timestamptz,
  due_at timestamptz,
  veterinarian_id text references public.veterinarians (id) on delete set null,
  notes text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_reports (
  id text primary key,
  legacy_id text unique,
  dog_id text references public.dogs (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  category text,
  severity text,
  description text,
  location text,
  status text,
  photo_path text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id text primary key,
  legacy_id text unique,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  link text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id text primary key,
  legacy_id text unique,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dogs_created_by_idx on public.dogs (created_by);
create index health_records_dog_id_idx on public.health_records (dog_id);
create index rescue_cases_status_idx on public.rescue_cases (status);
create index rescue_cases_dog_id_idx on public.rescue_cases (dog_id);
create index vaccinations_dog_id_idx on public.vaccinations (dog_id);
create index health_reports_severity_idx on public.health_reports (severity);
create index notifications_recipient_read_idx on public.notifications (recipient_id, read_at);

create function public.has_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = any (allowed_roles)
  );
$$;

revoke all on function public.has_role(public.app_role[]) from public;
grant execute on function public.has_role(public.app_role[]) to authenticated;

create function public.prevent_notification_owner_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.has_role(array['admin']::public.app_role[])
    and (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Notification recipients may only update read_at';
  end if;
  return new;
end;
$$;

create trigger notifications_owner_update_guard
before update on public.notifications
for each row execute function public.prevent_notification_owner_changes();

alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.health_records enable row level security;
alter table public.rescue_cases enable row level security;
alter table public.vaccinations enable row level security;
alter table public.ngos enable row level security;
alter table public.volunteers enable row level security;
alter table public.veterinarians enable row level security;
alter table public.notifications enable row level security;
alter table public.health_reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles readable by owner and admins" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.has_role(array['admin']::public.app_role[]));
create policy "Admins create profiles" on public.profiles
for insert to authenticated
with check (public.has_role(array['admin']::public.app_role[]));
create policy "Admins update profiles" on public.profiles
for update to authenticated
using (public.has_role(array['admin']::public.app_role[]))
with check (public.has_role(array['admin']::public.app_role[]));

create policy "Authorized roles read dogs" on public.dogs
for select to authenticated
using (public.has_role(array['admin', 'volunteer', 'veterinarian', 'ngo']::public.app_role[]));
create policy "Admins and veterinarians write dogs" on public.dogs
for all to authenticated
using (public.has_role(array['admin', 'veterinarian']::public.app_role[]))
with check (public.has_role(array['admin', 'veterinarian']::public.app_role[]));

create policy "Admins and veterinarians manage health records" on public.health_records
for all to authenticated
using (public.has_role(array['admin', 'veterinarian']::public.app_role[]))
with check (public.has_role(array['admin', 'veterinarian']::public.app_role[]));

create policy "Authorized roles read rescues" on public.rescue_cases
for select to authenticated
using (public.has_role(array['admin', 'volunteer', 'veterinarian', 'ngo']::public.app_role[]));
create policy "Rescue teams manage rescues" on public.rescue_cases
for all to authenticated
using (public.has_role(array['admin', 'volunteer', 'ngo']::public.app_role[]))
with check (public.has_role(array['admin', 'volunteer', 'ngo']::public.app_role[]));

create policy "Admins and veterinarians manage vaccinations" on public.vaccinations
for all to authenticated
using (public.has_role(array['admin', 'veterinarian']::public.app_role[]))
with check (public.has_role(array['admin', 'veterinarian']::public.app_role[]));

create policy "Authorized roles read NGOs" on public.ngos
for select to authenticated
using (public.has_role(array['admin', 'volunteer', 'veterinarian', 'ngo']::public.app_role[]));
create policy "Admins manage NGOs" on public.ngos
for all to authenticated
using (public.has_role(array['admin']::public.app_role[]))
with check (public.has_role(array['admin']::public.app_role[]));

create policy "Admins and NGOs read volunteers" on public.volunteers
for select to authenticated
using (public.has_role(array['admin', 'ngo']::public.app_role[]));
create policy "Admins manage volunteers" on public.volunteers
for all to authenticated
using (public.has_role(array['admin']::public.app_role[]))
with check (public.has_role(array['admin']::public.app_role[]));

create policy "Admins and veterinarians read veterinarians" on public.veterinarians
for select to authenticated
using (public.has_role(array['admin', 'veterinarian']::public.app_role[]));
create policy "Admins manage veterinarians" on public.veterinarians
for all to authenticated
using (public.has_role(array['admin']::public.app_role[]))
with check (public.has_role(array['admin']::public.app_role[]));

create policy "Recipients and admins read notifications" on public.notifications
for select to authenticated
using (public.has_role(array['admin']::public.app_role[]) or recipient_id = (select auth.uid()));
create policy "Admins create notifications" on public.notifications
for insert to authenticated
with check (public.has_role(array['admin']::public.app_role[]));
create policy "Recipients and admins update notifications" on public.notifications
for update to authenticated
using (public.has_role(array['admin']::public.app_role[]) or recipient_id = (select auth.uid()))
with check (public.has_role(array['admin']::public.app_role[]) or recipient_id = (select auth.uid()));
create policy "Admins delete notifications" on public.notifications
for delete to authenticated
using (public.has_role(array['admin']::public.app_role[]));

create policy "Authorized roles read health reports" on public.health_reports
for select to authenticated
using (public.has_role(array['admin', 'volunteer', 'veterinarian', 'ngo']::public.app_role[]));
create policy "Report teams manage health reports" on public.health_reports
for all to authenticated
using (public.has_role(array['admin', 'volunteer', 'veterinarian']::public.app_role[]))
with check (public.has_role(array['admin', 'volunteer', 'veterinarian']::public.app_role[]));

create policy "Admins read audit logs" on public.audit_logs
for select to authenticated
using (public.has_role(array['admin']::public.app_role[]));

grant select on public.profiles, public.dogs, public.health_records, public.rescue_cases,
  public.vaccinations, public.ngos, public.volunteers, public.veterinarians,
  public.notifications, public.health_reports, public.audit_logs to authenticated;
grant insert, update, delete on public.dogs, public.health_records, public.rescue_cases,
  public.vaccinations, public.ngos, public.volunteers, public.veterinarians,
  public.notifications, public.health_reports to authenticated;
grant insert, update on public.profiles to authenticated;
