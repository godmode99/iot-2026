# Deployment Readiness

## Purpose

This runbook prepares the Next.js dashboard and supporting backend for staging or production deployment.

## Deployment Shape

- Deploy the `dashboard/` workspace as the Vercel project root.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_TOKEN`, and backend-only secrets out of browser code.
- Point `BACKEND_URL` to the deployed backend/API origin that serves admin, ingest, provisioning, OTA, and notification routes.
- Use a separate Supabase project for staging and production.
- Use `ops/vercel-env-template.md` as the source checklist for Vercel and backend runtime variables.

## Required Vercel Project Settings

Use these settings for the dashboard project:

| setting | value |
| --- | --- |
| Root Directory | `dashboard` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | `.next` |
| Node.js | project default LTS |

If Vercel is linked from the repository root, make sure the Vercel project still uses `dashboard` as its root directory.

## Required Environment Variables

Set these in Vercel for preview and production:

- `APP_URL`
- `DASHBOARD_URL`
- `BACKEND_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `ADMIN_API_TOKEN`

Set these on the backend runtime, not in browser-exposed variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `ADMIN_API_TOKEN`
- `INGEST_SHARED_TOKEN`
- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `MQTT_TOPIC_PREFIX`
- `JWT_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `RESEND_API_KEY`
- `OTA_SIGNING_KEY_PATH`
- `BACKEND_RATE_LIMIT_ENABLED`

Do not create `NEXT_PUBLIC_*` variants of service role keys, admin tokens, signing keys, or broker passwords.

## Production Flags

These must be `false` in production:

- `ADMIN_ALLOW_INSECURE_DEV`
- `DASHBOARD_ALLOW_ACTOR_OVERRIDE`
- `INGEST_ALLOW_INSECURE_DEV`
- `PROVISIONING_ALLOW_INSECURE_DEV`

`NOTIFICATION_MODE=stub` is acceptable only for dry runs. Use `resend` or `line` before customer-facing alert delivery.

Keep `BACKEND_RATE_LIMIT_ENABLED=true` outside local debugging and tune route limits after real device publish cadence is measured.

## Supabase Auth Checklist

- Add the production `DASHBOARD_URL` to Supabase Auth site URL.
- Add callback redirect URL: `${DASHBOARD_URL}/auth/callback`.
- Add password reset redirect URL: `${DASHBOARD_URL}/reset-password`.
- Configure custom SMTP before customer-facing production email flows.
- Confirm RLS migrations have been applied.
- Run `pnpm db:smoke:rbac` against the target database before launch.

## Validation Commands

Run this locally before deployment:

```powershell
pnpm deploy:check:staging
pnpm deploy:check -- --env .env.production.local --target production
pnpm --dir dashboard build
pnpm --dir backend test
pnpm db:smoke:rbac
```

Validate the tracked template without requiring real secrets:

```powershell
pnpm deploy:check -- --env .env.example --target template
pnpm deploy:check -- --env .env.staging.example --target template
```

Validate staging after `.env.staging.local` is filled:

```powershell
pnpm deploy:check:staging
```

## Preview Gate

Before promoting a preview deployment:

- Login, signup, forgot password, and reset password work with Supabase Auth.
- `/dashboard` shows only farms/devices visible to the session.
- `/provision` binds an unbound QR device with a real session.
- `/farms/[farmId]` member invite and notification preference actions audit correctly.
- `/devices/[deviceId]` command and alert actions enforce permission checks.
- `/ops` is visible only to operator/admin roles.

## Rollback Gate

Rollback if any of these fail in production:

- Auth callback loop or session cookies fail.
- RLS exposes farms or devices outside the signed-in user's scope.
- Provisioning binds a device to the wrong farm.
- Commands can be queued without the required permission.
- Alert notifications fail silently without `notification_log` evidence.
