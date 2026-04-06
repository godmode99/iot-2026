create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  user_type text not null default 'customer'
    check (user_type in ('super_admin', 'operator', 'reseller', 'customer')),
  display_name text,
  preferred_locale text not null default 'th'
    check (preferred_locale in ('th', 'en', 'my')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  can_view boolean not null default true,
  can_receive_alerts boolean not null default true,
  can_manage_alerts boolean not null default false,
  can_send_commands boolean not null default false,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (farm_id, user_id)
);

create table public.farm_member_invites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  email text not null,
  invite_token_hash text not null unique,
  permission_json jsonb not null default '{}'::jsonb,
  invited_by uuid not null references auth.users (id) on delete cascade,
  accepted_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint farm_member_invites_accept_once check (
    accepted_at is null or revoked_at is null
  )
);

create table public.reseller_farms (
  id uuid primary key default gen_random_uuid(),
  reseller_user_id uuid not null references auth.users (id) on delete cascade,
  farm_id uuid not null references public.farms (id) on delete cascade,
  can_view boolean not null default true,
  can_manage_alerts boolean not null default false,
  can_send_safe_commands boolean not null default false,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (reseller_user_id, farm_id)
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email_enabled boolean not null default true,
  line_enabled boolean not null default false,
  critical_only boolean not null default false,
  alert_types text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (farm_id, user_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_type text not null
    check (actor_type in ('super_admin', 'operator', 'reseller', 'customer', 'farm_member', 'device', 'system')),
  farm_id uuid references public.farms (id) on delete set null,
  device_id uuid references public.devices (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_user_profiles_user_type
  on public.user_profiles (user_type);

create index idx_farm_members_user_id
  on public.farm_members (user_id);

create index idx_farm_members_farm_role
  on public.farm_members (farm_id, role);

create index idx_farm_member_invites_farm_id
  on public.farm_member_invites (farm_id);

create index idx_farm_member_invites_invited_by
  on public.farm_member_invites (invited_by);

create unique index idx_farm_member_invites_pending_email
  on public.farm_member_invites (farm_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index idx_reseller_farms_reseller_user_id
  on public.reseller_farms (reseller_user_id);

create index idx_reseller_farms_farm_id
  on public.reseller_farms (farm_id);

create index idx_notification_preferences_user_id
  on public.notification_preferences (user_id);

create index idx_notification_preferences_farm_id
  on public.notification_preferences (farm_id);

create index idx_audit_log_actor_created_at_desc
  on public.audit_log (actor_user_id, created_at desc);

create index idx_audit_log_farm_created_at_desc
  on public.audit_log (farm_id, created_at desc);

create index idx_audit_log_device_created_at_desc
  on public.audit_log (device_id, created_at desc);

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create trigger farm_members_set_updated_at
before update on public.farm_members
for each row
execute function public.set_updated_at();

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    user_id,
    user_type,
    display_name,
    preferred_locale
  ) values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'th')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create or replace function public.ensure_farm_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.farm_members (
    farm_id,
    user_id,
    role,
    can_view,
    can_receive_alerts,
    can_manage_alerts,
    can_send_commands,
    invited_by
  ) values (
    new.id,
    new.owner_user_id,
    'owner',
    true,
    true,
    true,
    true,
    new.owner_user_id
  )
  on conflict (farm_id, user_id) do update
  set
    role = 'owner',
    can_view = true,
    can_receive_alerts = true,
    can_manage_alerts = true,
    can_send_commands = true,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists farms_ensure_owner_membership on public.farms;

create trigger farms_ensure_owner_membership
after insert or update of owner_user_id on public.farms
for each row
execute function public.ensure_farm_owner_membership();

create or replace function public.current_user_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select user_type
  from public.user_profiles
  where user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_type() = 'super_admin', false);
$$;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_type() = 'operator', false);
$$;

create or replace function public.is_admin_or_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin() or public.is_operator();
$$;

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
      and farm.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.farm_members member
    where member.farm_id = target_farm_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

create or replace function public.member_can_view(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members member
    where member.farm_id = target_farm_id
      and member.user_id = (select auth.uid())
      and member.can_view = true
  );
$$;

create or replace function public.member_can_manage_alerts(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members member
    where member.farm_id = target_farm_id
      and member.user_id = (select auth.uid())
      and member.can_manage_alerts = true
  );
$$;

create or replace function public.member_can_send_commands(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members member
    where member.farm_id = target_farm_id
      and member.user_id = (select auth.uid())
      and member.can_send_commands = true
  );
$$;

create or replace function public.reseller_manages_farm(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reseller_farms assignment
    join public.user_profiles profile
      on profile.user_id = assignment.reseller_user_id
    where assignment.farm_id = target_farm_id
      and assignment.reseller_user_id = (select auth.uid())
      and assignment.can_view = true
      and profile.user_type = 'reseller'
  );
$$;

create or replace function public.reseller_can_manage_alerts(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reseller_farms assignment
    join public.user_profiles profile
      on profile.user_id = assignment.reseller_user_id
    where assignment.farm_id = target_farm_id
      and assignment.reseller_user_id = (select auth.uid())
      and assignment.can_manage_alerts = true
      and profile.user_type = 'reseller'
  );
$$;

create or replace function public.reseller_can_send_safe_commands(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reseller_farms assignment
    join public.user_profiles profile
      on profile.user_id = assignment.reseller_user_id
    where assignment.farm_id = target_farm_id
      and assignment.reseller_user_id = (select auth.uid())
      and assignment.can_send_safe_commands = true
      and profile.user_type = 'reseller'
  );
$$;

create or replace function public.can_view_farm(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_operator()
    or public.user_owns_farm(target_farm_id)
    or public.member_can_view(target_farm_id)
    or public.reseller_manages_farm(target_farm_id);
$$;

create or replace function public.can_manage_farm_alerts(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_operator()
    or public.user_owns_farm(target_farm_id)
    or public.member_can_manage_alerts(target_farm_id)
    or public.reseller_can_manage_alerts(target_farm_id);
$$;

create or replace function public.can_manage_farm_settings(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_operator()
    or public.user_owns_farm(target_farm_id);
$$;

create or replace function public.can_send_farm_command(target_farm_id uuid, command_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when command_type = 'ota_apply' then
      public.is_admin_or_operator()
      or public.user_owns_farm(target_farm_id)
    when command_type in ('reboot', 'config_refresh', 'ota_check', 'telemetry_flush') then
      public.is_admin_or_operator()
      or public.user_owns_farm(target_farm_id)
      or public.member_can_send_commands(target_farm_id)
      or public.reseller_can_send_safe_commands(target_farm_id)
    else false
  end;
$$;

alter table public.user_profiles enable row level security;
alter table public.farm_members enable row level security;
alter table public.farm_member_invites enable row level security;
alter table public.reseller_farms enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists farms_select_own on public.farms;
drop policy if exists farms_insert_own on public.farms;
drop policy if exists farms_update_own on public.farms;
drop policy if exists farms_delete_own on public.farms;
drop policy if exists devices_select_owned_farms on public.devices;
drop policy if exists telemetry_select_owned_farms on public.telemetry;
drop policy if exists device_status_select_owned_farms on public.device_status;
drop policy if exists alerts_select_owned_farms on public.alerts;
drop policy if exists notification_log_select_owned_farms on public.notification_log;

create policy user_profiles_select_self_or_ops
  on public.user_profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin_or_operator()
  );

create policy farms_select_scoped
  on public.farms
  for select
  to authenticated
  using (public.can_view_farm(id));

create policy farms_insert_own
  on public.farms
  for insert
  to authenticated
  with check (
    owner_user_id = (select auth.uid())
    or public.is_admin_or_operator()
  );

create policy farms_update_owner_or_ops
  on public.farms
  for update
  to authenticated
  using (public.can_manage_farm_settings(id))
  with check (public.can_manage_farm_settings(id));

create policy farms_delete_owner_or_ops
  on public.farms
  for delete
  to authenticated
  using (
    public.is_admin_or_operator()
    or public.user_owns_farm(id)
  );

create policy farm_members_select_scoped
  on public.farm_members
  for select
  to authenticated
  using (
    public.can_view_farm(farm_id)
    or user_id = (select auth.uid())
  );

create policy farm_members_insert_owner_or_ops
  on public.farm_members
  for insert
  to authenticated
  with check (public.can_manage_farm_settings(farm_id));

create policy farm_members_update_owner_or_ops
  on public.farm_members
  for update
  to authenticated
  using (public.can_manage_farm_settings(farm_id))
  with check (public.can_manage_farm_settings(farm_id));

create policy farm_members_delete_owner_or_ops
  on public.farm_members
  for delete
  to authenticated
  using (public.can_manage_farm_settings(farm_id));

create policy farm_member_invites_select_owner_or_ops
  on public.farm_member_invites
  for select
  to authenticated
  using (public.can_manage_farm_settings(farm_id));

create policy farm_member_invites_insert_owner_or_ops
  on public.farm_member_invites
  for insert
  to authenticated
  with check (public.can_manage_farm_settings(farm_id));

create policy farm_member_invites_update_owner_or_ops
  on public.farm_member_invites
  for update
  to authenticated
  using (public.can_manage_farm_settings(farm_id))
  with check (public.can_manage_farm_settings(farm_id));

create policy reseller_farms_select_scoped
  on public.reseller_farms
  for select
  to authenticated
  using (
    public.is_admin_or_operator()
    or reseller_user_id = (select auth.uid())
    or public.user_owns_farm(farm_id)
  );

create policy reseller_farms_insert_ops
  on public.reseller_farms
  for insert
  to authenticated
  with check (public.is_admin_or_operator());

create policy reseller_farms_update_ops
  on public.reseller_farms
  for update
  to authenticated
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy reseller_farms_delete_ops
  on public.reseller_farms
  for delete
  to authenticated
  using (public.is_admin_or_operator());

create policy notification_preferences_select_scoped
  on public.notification_preferences
  for select
  to authenticated
  using (
    public.can_view_farm(farm_id)
    or user_id = (select auth.uid())
  );

create policy notification_preferences_insert_self
  on public.notification_preferences
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_farm(farm_id)
  );

create policy notification_preferences_insert_owner_or_ops
  on public.notification_preferences
  for insert
  to authenticated
  with check (public.can_manage_farm_settings(farm_id));

create policy notification_preferences_update_self
  on public.notification_preferences
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.can_view_farm(farm_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.can_view_farm(farm_id)
  );

create policy notification_preferences_update_owner_or_ops
  on public.notification_preferences
  for update
  to authenticated
  using (public.can_manage_farm_settings(farm_id))
  with check (public.can_manage_farm_settings(farm_id));

create policy devices_select_scoped
  on public.devices
  for select
  to authenticated
  using (
    farm_id is not null
    and public.can_view_farm(farm_id)
  );

create policy telemetry_select_scoped
  on public.telemetry
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.devices device
      where device.id = telemetry.device_id
        and device.farm_id is not null
        and public.can_view_farm(device.farm_id)
    )
  );

create policy device_status_select_scoped
  on public.device_status
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.devices device
      where device.id = device_status.device_id
        and device.farm_id is not null
        and public.can_view_farm(device.farm_id)
    )
  );

create policy alerts_select_scoped
  on public.alerts
  for select
  to authenticated
  using (public.can_view_farm(farm_id));

create policy alerts_update_manage_scoped
  on public.alerts
  for update
  to authenticated
  using (public.can_manage_farm_alerts(farm_id))
  with check (public.can_manage_farm_alerts(farm_id));

create policy command_log_select_scoped
  on public.command_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.devices device
      where device.id = command_log.device_id
        and device.farm_id is not null
        and public.can_view_farm(device.farm_id)
    )
  );

create policy command_log_insert_scoped
  on public.command_log
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.devices device
      where device.id = command_log.device_id
        and device.farm_id is not null
        and public.can_send_farm_command(device.farm_id, command_log.command_type)
    )
  );

create policy notification_log_select_scoped
  on public.notification_log
  for select
  to authenticated
  using (
    farm_id is not null
    and public.can_view_farm(farm_id)
  );

create policy audit_log_select_scoped
  on public.audit_log
  for select
  to authenticated
  using (
    public.is_admin_or_operator()
    or (
      farm_id is not null
      and public.can_view_farm(farm_id)
    )
  );

comment on table public.user_profiles is 'Global user profile and coarse platform role for Supabase Auth users.';
comment on table public.farm_members is 'Farm-scoped membership and permission flags.';
comment on table public.farm_member_invites is 'Single-use email invite lifecycle for farm members.';
comment on table public.reseller_farms is 'Explicit reseller-to-farm support scope.';
comment on table public.notification_preferences is 'Per-user notification preferences inside a farm scope.';
comment on table public.audit_log is 'Immutable production action audit log.';
