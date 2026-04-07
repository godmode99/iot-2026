# Vercel Environment Template

## Purpose

Use this template when creating preview or production variables for the Next.js dashboard project.

## Dashboard Project

Set these in the Vercel project that uses `dashboard/` as its root directory:

| key | preview example | production requirement | exposed to browser |
| --- | --- | --- | --- |
| `APP_URL` | `https://sb00-preview.vercel.app` | dashboard HTTPS origin | no |
| `DASHBOARD_URL` | `https://sb00-preview.vercel.app` | dashboard HTTPS origin | no |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase preview URL | Supabase production URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase preview anon key | Supabase production anon key | yes |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `th` | `th`, `en`, or `my` | yes |
| `SUPABASE_DB_URL` | Supabase preview DB URL | Supabase production DB URL | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase preview service role key | Supabase production service role key | no |
| `INGEST_SHARED_TOKEN` | generated secret | generated secret until per-device credentials exist | no |
| `JWT_SECRET` | generated secret | generated secret | no |
| `DASHBOARD_ALLOW_ACTOR_OVERRIDE` | `false` | `false` | no |
| `BACKEND_RATE_LIMIT_ENABLED` | `true` | `true` | no |

Do not add `NEXT_PUBLIC_` variants for database URLs, service role keys, ingest tokens, broker passwords, signing keys, or JWT secrets.

## Backend Runtime

Set these only on the backend/API runtime:

| key | production requirement |
| --- | --- |
| `SUPABASE_URL` | Supabase production URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_DB_URL` | database connection string for migrations/admin tooling |
| `INGEST_SHARED_TOKEN` | shared device ingest token until stronger per-device credentials exist |
| `INGEST_ALLOW_INSECURE_DEV` | `false` |
| `PROVISIONING_ALLOW_INSECURE_DEV` | `false` |
| `ADMIN_ALLOW_INSECURE_DEV` | `false` |
| `BACKEND_RATE_LIMIT_ENABLED` | `true` |
| `BACKEND_RATE_LIMIT_ADMIN_MAX` | start with `60` per minute |
| `BACKEND_RATE_LIMIT_COMMAND_MAX` | start with `120` per minute |
| `BACKEND_RATE_LIMIT_INGEST_MAX` | tune after real device publish interval is confirmed |
| `BACKEND_RATE_LIMIT_PROVISIONING_MAX` | start with `60` per minute |
| `MQTT_BROKER_URL` | broker TLS URL |
| `MQTT_USERNAME` | broker username |
| `MQTT_PASSWORD` | broker password |
| `MQTT_TOPIC_PREFIX` | production topic prefix |
| `JWT_SECRET` | generated secret |
| `NOTIFICATION_MODE` | `resend` or `line` before customer-facing alert delivery |
| `RESEND_API_KEY` | required when `NOTIFICATION_MODE=resend` |
| `LINE_CHANNEL_ACCESS_TOKEN` | required when LINE delivery is enabled |
| `OTA_RELEASES_PATH` | release catalog path |
| `OTA_RELEASE_CHANNEL` | `stable` unless staging rollout is intentional |
| `OTA_SIGNING_KEY_PATH` | production signing key location |

## Supabase Auth Redirects

Add these URLs to the Supabase Auth project:

- `${DASHBOARD_URL}`
- `${DASHBOARD_URL}/auth/callback`
- `${DASHBOARD_URL}/reset-password`

For preview deployments, add the preview domain or Vercel preview wildcard policy that the team approves.

## Validation

Run before promoting preview to production:

```powershell
pnpm deploy:check:staging
pnpm deploy:check -- --env .env.production.local --target production
pnpm --dir dashboard build
pnpm --dir backend test
pnpm db:smoke:rbac
```
