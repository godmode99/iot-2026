# EX-01 Runbook

This repository now contains the first runnable workspace for:

- `firmware/` - ESP-IDF skeleton for `ESP32-S3`
- `backend/` - local API and ingest placeholder
- `dashboard/` - Next.js production frontend shell
- `shared/` - contracts and baseline schemas
- `ops/` - environment, secrets, and topic notes

## Prerequisites

- `Node.js`
- `pnpm`
- `ESP-IDF v5.4.3`

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in real secrets when available
3. For placeholder local boot, defaults will still allow backend and dashboard to start

## Backend

Run:

```powershell
pnpm --dir backend dev
```

Health check:

```powershell
Invoke-WebRequest http://localhost:3100/health
```

Backend production notes:

- Set `INGEST_SHARED_TOKEN` before exposing `POST /api/ingest/telemetry` outside local development
- Local development may use `INGEST_ALLOW_INSECURE_DEV=true`, but production-like environments should disable it
- Provisioning may use `actor_user_id` only in local development when `PROVISIONING_ALLOW_INSECURE_DEV=true`
- Production-like provisioning should pass `x-actor-user-id` from a trusted auth layer
- Dashboard-to-backend admin and provisioning calls can use `ADMIN_API_TOKEN` plus `DASHBOARD_ACTOR_USER_ID`
- Keep `DASHBOARD_ALLOW_ACTOR_OVERRIDE=false` outside local debugging so operators cannot spoof actor ids from forms
- Alert notification refreshes are rate-limited by `ALERT_NOTIFY_MIN_INTERVAL_SEC`
- `NOTIFICATION_MODE=stub` keeps local alert delivery in console-only mode
- Farm-scoped notification contacts on `public.farms` are preferred over `.env` fallback recipients
- Set `ADMIN_API_TOKEN` before exposing admin command or audit routes
- Supabase Auth/RBAC now has farm-scoped owner/member/reseller helpers in local migrations
- Reseller support access must come from `public.reseller_farms`; do not infer it from email/domain alone
- OTA manifest is served from `OTA_RELEASES_PATH` and should be backed by real artifact URLs plus checksums
- Auth/RBAC API details live in `ops/auth-rbac-api.md`
- Deployment readiness details live in `ops/deployment-readiness.md`
- Run backend tests with `pnpm test:backend`

## Dashboard

Run:

```powershell
pnpm --dir dashboard dev
```

Open:

```text
http://localhost:3000
```

Dashboard notes:

- The production shell now uses Next.js App Router.
- Legacy MVP server code is preserved at `dashboard/src/legacy-server.mjs` while routes migrate into Next.js.
- Public browser auth config must use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` or service-role behavior to browser code.
- Before preview or production deploys, run `pnpm deploy:check -- --env .env.production.local --target production`.

## Run Both Web Apps

Run:

```powershell
pnpm dev
```

## Firmware

Build:

```powershell
pnpm build:firmware
```

This helper script pins the working `ESP-IDF v5.4.3` tool paths for this machine and produces:

- `firmware/build/sb00_bootstrap.bin`
- `firmware/build/bootloader/bootloader.bin`

The firmware app prints a bootstrap banner and boot summary.

## Database

Start the local Supabase stack:

```powershell
pnpm db:start
```

Apply migrations locally:

```powershell
pnpm db:reset
```

Lint schema SQL:

```powershell
pnpm db:lint
```

Smoke-test local RBAC/RLS expectations:

```powershell
pnpm db:smoke:rbac
```

## Workspace Outputs

`EX-01` currently provides:

- stable `.env.example`
- starter shared contracts
- secret checklist
- MQTT topic baseline
- local Supabase workflow and first migration path
- bootable backend and Next.js dashboard shell
- buildable firmware skeleton
- production-oriented ops notes in `ops/incident-response.md`, `ops/support-flow.md`, and `ops/production-readiness-checklist.md`

## Next Tasks Unlocked

- `EX-03` firmware skeleton expansion
- `EX-06` schema and migrations
- `EX-09` dashboard MVP
