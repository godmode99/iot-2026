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

insert into public.farms (
  id,
  name,
  owner_user_id
) values (
  '22222222-2222-2222-2222-222222222222',
  'SB-00 Dev Farm',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do update
set
  name = excluded.name,
  owner_user_id = excluded.owner_user_id;

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
