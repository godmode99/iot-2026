# Schema Notes

`EX-06` should create these core entities first:

- `farms`
- `devices`
- `telemetry`
- `device_status`
- `alerts`
- `command_log`

Battery metadata must exist on `devices`:

- `battery_variant`
- `battery_profile_version`
- `usable_capacity_mah`

Local workflow:

- `pnpm db:start`
- `pnpm db:reset`
- `pnpm db:lint`

The first-pass RLS boundary is farm ownership through `farms.owner_user_id`.
