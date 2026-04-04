# Supabase Local Workflow

This folder contains the first local Supabase setup for `EX-06`.

## Commands

Start the local stack:

```powershell
pnpm db:start
```

Reset the local database and apply migrations plus seed:

```powershell
pnpm db:reset
```

Lint migrations and schema SQL:

```powershell
pnpm db:lint
```

## EX-06 Output

The first migration creates:

- `farms`
- `devices`
- `telemetry`
- `device_status`
- `alerts`
- `command_log`

It also adds:

- baseline indexes for ingest and dashboard queries
- starter RLS policies for farm ownership boundaries
- battery metadata fields on `devices`
