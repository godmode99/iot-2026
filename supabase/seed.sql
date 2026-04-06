insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'dev-owner@example.com',
  crypt('dev-password', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev Owner"}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do update
set
  email = excluded.email,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = timezone('utc', now());

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'dev-operator@example.com',
  crypt('dev-password', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev Operator"}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated',
  'authenticated',
  'dev-reseller@example.com',
  crypt('dev-password', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev Reseller"}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
),
(
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated',
  'authenticated',
  'dev-member@example.com',
  crypt('dev-password', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev Farm Member"}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do update
set
  email = excluded.email,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = timezone('utc', now());

insert into public.user_profiles (
  user_id,
  user_type,
  display_name,
  preferred_locale
) values
(
  '11111111-1111-1111-1111-111111111111',
  'customer',
  'Dev Owner',
  'th'
),
(
  '33333333-3333-3333-3333-333333333333',
  'operator',
  'Dev Operator',
  'th'
),
(
  '44444444-4444-4444-4444-444444444444',
  'reseller',
  'Dev Reseller',
  'th'
),
(
  '55555555-5555-5555-5555-555555555555',
  'customer',
  'Dev Farm Member',
  'th'
)
on conflict (user_id) do update
set
  user_type = excluded.user_type,
  display_name = excluded.display_name,
  preferred_locale = excluded.preferred_locale,
  updated_at = timezone('utc', now());

insert into public.farms (
  id,
  name,
  owner_user_id,
  alert_email_to,
  alert_line_user_id
) values (
  '22222222-2222-2222-2222-222222222222',
  'SB-00 Dev Farm',
  '11111111-1111-1111-1111-111111111111',
  'farm-alerts@example.com',
  'Udevfarmline001'
)
on conflict (id) do update
set
  name = excluded.name,
  owner_user_id = excluded.owner_user_id,
  alert_email_to = excluded.alert_email_to,
  alert_line_user_id = excluded.alert_line_user_id;

insert into public.devices (
  device_id,
  serial_number,
  farm_id,
  provisioning_state,
  firmware_version,
  publish_interval_sec,
  battery_variant,
  battery_profile_version,
  usable_capacity_mah
) values (
  'sb00-devkit-01',
  'SB00-BOOTSTRAP',
  '22222222-2222-2222-2222-222222222222',
  'active',
  '0.1.0',
  300,
  'standard',
  'v1',
  5600
)
on conflict (device_id) do update
set
  serial_number = excluded.serial_number,
  farm_id = excluded.farm_id,
  provisioning_state = excluded.provisioning_state,
  firmware_version = excluded.firmware_version,
  publish_interval_sec = excluded.publish_interval_sec,
  battery_variant = excluded.battery_variant,
  battery_profile_version = excluded.battery_profile_version,
  usable_capacity_mah = excluded.usable_capacity_mah;

insert into public.devices (
  device_id,
  serial_number,
  provisioning_state,
  firmware_version,
  publish_interval_sec,
  battery_variant,
  battery_profile_version,
  usable_capacity_mah
) values (
  'sb00-devkit-02',
  'SB00-UNBOUND',
  'inventory',
  '0.1.0',
  300,
  'standard',
  'v1',
  5600
)
on conflict (device_id) do update
set
  serial_number = excluded.serial_number,
  provisioning_state = excluded.provisioning_state,
  firmware_version = excluded.firmware_version,
  publish_interval_sec = excluded.publish_interval_sec,
  battery_variant = excluded.battery_variant,
  battery_profile_version = excluded.battery_profile_version,
  usable_capacity_mah = excluded.usable_capacity_mah;

insert into public.farm_members (
  farm_id,
  user_id,
  role,
  can_view,
  can_receive_alerts,
  can_manage_alerts,
  can_send_commands,
  invited_by
) values
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'owner',
  true,
  true,
  true,
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  '22222222-2222-2222-2222-222222222222',
  '55555555-5555-5555-5555-555555555555',
  'member',
  true,
  true,
  false,
  false,
  '11111111-1111-1111-1111-111111111111'
)
on conflict (farm_id, user_id) do update
set
  role = excluded.role,
  can_view = excluded.can_view,
  can_receive_alerts = excluded.can_receive_alerts,
  can_manage_alerts = excluded.can_manage_alerts,
  can_send_commands = excluded.can_send_commands,
  invited_by = excluded.invited_by,
  updated_at = timezone('utc', now());

insert into public.reseller_farms (
  reseller_user_id,
  farm_id,
  can_view,
  can_manage_alerts,
  can_send_safe_commands,
  assigned_by
) values (
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  true,
  true,
  true,
  '33333333-3333-3333-3333-333333333333'
)
on conflict (reseller_user_id, farm_id) do update
set
  can_view = excluded.can_view,
  can_manage_alerts = excluded.can_manage_alerts,
  can_send_safe_commands = excluded.can_send_safe_commands,
  assigned_by = excluded.assigned_by,
  assigned_at = timezone('utc', now());

insert into public.notification_preferences (
  farm_id,
  user_id,
  email_enabled,
  line_enabled,
  critical_only,
  alert_types
) values
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  true,
  true,
  false,
  array[]::text[]
),
(
  '22222222-2222-2222-2222-222222222222',
  '55555555-5555-5555-5555-555555555555',
  true,
  false,
  true,
  array['low_battery', 'offline']::text[]
)
on conflict (farm_id, user_id) do update
set
  email_enabled = excluded.email_enabled,
  line_enabled = excluded.line_enabled,
  critical_only = excluded.critical_only,
  alert_types = excluded.alert_types,
  updated_at = timezone('utc', now());
