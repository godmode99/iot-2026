# Staging Setup

## Purpose

Use this checklist to connect the project to staging without committing secrets.

## Safe Secret Handling

- Copy `.env.staging.example` to `.env.staging.local`.
- Fill real staging values only in `.env.staging.local`.
- Do not paste secrets into tracked docs, source code, screenshots, or chat history when avoidable.
- `.env.staging.local` is ignored by git through `.env.*.local`.

You can create the local file and generate local-only tokens with:

```powershell
pnpm env:init:staging
```

The command writes `.env.staging.local`, generates `INGEST_SHARED_TOKEN` and `JWT_SECRET`, and does not print the generated values. If the file already exists, it refuses to overwrite unless you pass `--force`:

```powershell
pnpm env:init:staging -- --force
```

## Minimum Staging Inputs

Create or collect these before validation:

- Supabase staging project URL.
- Supabase staging anon key.
- Supabase staging service role key.
- Supabase staging database URL.
- Dashboard staging URL.
- Generated `INGEST_SHARED_TOKEN`.
- Generated `JWT_SECRET`.

MQTT, LINE, Resend, and OTA signing can stay on placeholder/stub values until that specific integration is being tested. The staging checker warns on missing worker/device values but does not block dashboard/auth validation.

## Supabase Auth Redirects

Add these in Supabase Auth for the staging project:

- `${DASHBOARD_URL}`
- `${DASHBOARD_URL}/auth/callback`

Use the final Vercel preview/staging URL, not localhost.

Enable Google, Facebook, and Apple providers for the staging project before inviting testers. Email/password signup is not part of production v1. Facebook should request `public_profile` only; collect contact email later in onboarding/settings if the provider does not return one.

## Vercel Dashboard Project

Use these Vercel settings:

| setting | value |
| --- | --- |
| Root Directory | `dashboard` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | `.next` |

Set these Vercel variables for the dashboard project:

- `APP_URL`
- `DASHBOARD_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_SHARED_TOKEN`
- `JWT_SECRET`
- `DASHBOARD_ALLOW_ACTOR_OVERRIDE=false`
- `BACKEND_RATE_LIMIT_ENABLED=true`

Do not set database URLs, service role keys, or broker passwords as `NEXT_PUBLIC_*` variables.

## Backend Runtime

Set backend-only secrets on the API/backend runtime:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `INGEST_SHARED_TOKEN`
- `JWT_SECRET`
- `ADMIN_ALLOW_INSECURE_DEV=false`
- `INGEST_ALLOW_INSECURE_DEV=false`
- `PROVISIONING_ALLOW_INSECURE_DEV=false`
- `BACKEND_RATE_LIMIT_ENABLED=true`

If notifications are not ready, use:

```text
NOTIFICATION_MODE=stub
```

## Local Validation

After `.env.staging.local` is filled, run:

```powershell
pnpm env:init:staging -- --dry-run
pnpm deploy:check:staging
pnpm --dir dashboard build
pnpm --dir backend test
pnpm db:smoke:rbac
```

The staging deploy check validates required keys, HTTPS URLs, unsafe dev flags, rate limiting, and short secret values without printing the secret values.

## First Preview Gate

Before inviting anyone to test staging:

- Google, Facebook, and Apple login works against Supabase staging.
- First-login users complete `/onboarding`.
- `/dashboard` only shows farms visible to the signed-in user.
- `/provision` binds a staging device to the selected farm.
- `/farms/[farmId]` invite and notification preference actions write audit records.
- `/devices/[deviceId]` command and alert actions enforce RBAC permissions.
- `/ops` is visible only to operator/admin users.
