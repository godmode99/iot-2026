create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.user_owns_farm(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farms farm
    where farm.id = target_farm_id
      and farm.owner_user_id = auth.uid()
  );
$$;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  serial_number text not null unique,
  farm_id uuid references public.farms (id) on delete set null,
  provisioning_state text not null default 'inventory'
    check (provisioning_state in ('inventory', 'registered', 'bound', 'active', 'retired')),
  firmware_version text,
  publish_interval_sec integer not null default 300
    check (publish_interval_sec between 60 and 86400),
  battery_variant text not null default 'standard'
    check (battery_variant in ('standard', 'long_life')),
  battery_profile_version text not null default 'v1',
  usable_capacity_mah integer not null check (usable_capacity_mah > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.telemetry (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.devices (id) on delete cascade,
  recorded_at timestamptz not null,
  temperature_c numeric(5, 2),
  turbidity_raw integer,
  battery_percent numeric(5, 2) check (battery_percent between 0 and 100),
  battery_mv integer check (battery_mv is null or battery_mv > 0),
  lat double precision,
  lng double precision,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint telemetry_lat_lng_pair check (
    (lat is null and lng is null)
    or (lat is not null and lng is not null)
  )
);

create table public.device_status (
  device_id uuid primary key references public.devices (id) on delete cascade,
  last_seen_at timestamptz,
  online_state text not null default 'unknown'
    check (online_state in ('unknown', 'online', 'offline', 'stale')),
  battery_percent numeric(5, 2) check (battery_percent between 0 and 100),
  battery_mv integer check (battery_mv is null or battery_mv > 0),
  signal_quality smallint check (signal_quality between 0 and 100),
  gps_fix_state text not null default 'none'
    check (gps_fix_state in ('none', '2d', '3d')),
  last_lat double precision,
  last_lng double precision,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint device_status_lat_lng_pair check (
    (last_lat is null and last_lng is null)
    or (last_lat is not null and last_lng is not null)
  )
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  farm_id uuid not null references public.farms (id) on delete cascade,
  alert_type text not null,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'suppressed')),
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  opened_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint alerts_resolved_after_opened check (
    resolved_at is null or resolved_at >= opened_at
  )
);

create table public.command_log (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  command_type text not null,
  requested_by uuid references auth.users (id) on delete set null,
  request_source text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'succeeded', 'failed', 'cancelled')),
  requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_devices_farm_id
  on public.devices (farm_id);

create index idx_devices_farm_state
  on public.devices (farm_id, provisioning_state);

create index idx_telemetry_device_recorded_at_desc
  on public.telemetry (device_id, recorded_at desc);

create index idx_alerts_device_status
  on public.alerts (device_id, status);

create index idx_alerts_farm_status
  on public.alerts (farm_id, status);

create index idx_device_status_last_seen_at
  on public.device_status (last_seen_at desc);

create index idx_command_log_device_requested_at_desc
  on public.command_log (device_id, requested_at desc);

create unique index idx_alerts_active_unique
  on public.alerts (device_id, alert_type)
  where status in ('open', 'acknowledged');

create trigger farms_set_updated_at
before update on public.farms
for each row
execute function public.set_updated_at();

create trigger devices_set_updated_at
before update on public.devices
for each row
execute function public.set_updated_at();

create trigger device_status_set_updated_at
before update on public.device_status
for each row
execute function public.set_updated_at();

create trigger alerts_set_updated_at
before update on public.alerts
for each row
execute function public.set_updated_at();

alter table public.farms enable row level security;
alter table public.devices enable row level security;
alter table public.telemetry enable row level security;
alter table public.device_status enable row level security;
alter table public.alerts enable row level security;
alter table public.command_log enable row level security;

create policy farms_select_own
  on public.farms
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy farms_insert_own
  on public.farms
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy farms_update_own
  on public.farms
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy farms_delete_own
  on public.farms
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

create policy devices_select_owned_farms
  on public.devices
  for select
  to authenticated
  using (
    farm_id is not null
    and public.user_owns_farm(farm_id)
  );

create policy telemetry_select_owned_farms
  on public.telemetry
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.devices device
      where device.id = telemetry.device_id
        and device.farm_id is not null
        and public.user_owns_farm(device.farm_id)
    )
  );

create policy device_status_select_owned_farms
  on public.device_status
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.devices device
      where device.id = device_status.device_id
        and device.farm_id is not null
        and public.user_owns_farm(device.farm_id)
    )
  );

create policy alerts_select_owned_farms
  on public.alerts
  for select
  to authenticated
  using (public.user_owns_farm(farm_id));

comment on table public.farms is 'Tenant boundary for farm-level ownership.';
comment on table public.devices is 'Device identity, farm binding, and battery metadata.';
comment on table public.telemetry is 'Append-only telemetry history.';
comment on table public.device_status is 'Last-known device status for fast dashboard reads.';
comment on table public.alerts is 'Active and historical alert records.';
comment on table public.command_log is 'Audit trail for commands, provisioning actions, and OTA operations.';
