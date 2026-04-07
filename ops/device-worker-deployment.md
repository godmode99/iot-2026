# Device Worker Deployment

## Purpose

The device worker is the production runtime for device-facing and background-facing APIs. The Next.js dashboard handles customer/admin web actions on Vercel; this worker handles device ingest, device command fetch/ack, and OTA manifest requests.

## Runtime Shape

- Entrypoint: `backend/src/worker-server.mjs`
- Local command: `pnpm --dir backend worker:start`
- Container: `backend/Dockerfile`
- Recommended production target: Cloud Run
- Alternative target: Fly.io

## Exposed Routes

- `GET /health`
- `GET /api/contracts`
- `POST /api/ingest/telemetry`
- `GET /api/device/commands?device_id=...`
- `POST /api/device/commands/:commandId/ack`
- `GET /api/ota/manifest`

Web/admin/customer actions should stay in Next.js server actions unless the action is device-facing or long-running.

## Required Worker Environment

Set these on the worker service:

- `NODE_ENV=production`
- `PORT=8080`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `INGEST_SHARED_TOKEN`
- `JWT_SECRET`
- `MQTT_TOPIC_PREFIX`
- `INGEST_ALLOW_INSECURE_DEV=false`
- `PROVISIONING_ALLOW_INSECURE_DEV=false`
- `ADMIN_ALLOW_INSECURE_DEV=false`
- `BACKEND_RATE_LIMIT_ENABLED=true`
- `BACKEND_REQUEST_LOGGING=true`
- `OTA_RELEASES_PATH=ops/ota-releases.json`
- `OTA_RELEASE_CHANNEL=staging` or `stable`

MQTT broker credentials are required before MQTT bridge/long-running subscriber work is enabled:

- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`

Notification delivery can remain `NOTIFICATION_MODE=stub` for staging dry runs, but production customer-facing alerts should switch to `resend` or `line` after credentials and recipient policy are verified.

## Cloud Run Baseline

Build from the repository root:

```powershell
docker build -f backend/Dockerfile -t asia-southeast1-docker.pkg.dev/PROJECT_ID/sb00/device-worker:staging .
```

Push and deploy with your project/region values:

```powershell
docker push asia-southeast1-docker.pkg.dev/PROJECT_ID/sb00/device-worker:staging
gcloud run deploy sb00-device-worker-staging `
  --image asia-southeast1-docker.pkg.dev/PROJECT_ID/sb00/device-worker:staging `
  --region asia-southeast1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080
```

Use Secret Manager or Cloud Run secret mounts for service role keys, database URLs, ingest tokens, broker passwords, notification credentials, and signing keys. Do not bake secrets into the image.

## Fly.io Alternative

Fly.io is acceptable if the team prefers a lighter first deploy:

```powershell
fly launch --dockerfile backend/Dockerfile --name sb00-device-worker-staging --region sin
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

Cloud Run remains the baseline production target because IAM, Secret Manager, logs, and scaling controls are stronger for a production worker path.

## Verification

After deploy:

```powershell
curl https://WORKER_URL/health
```

Then run a staging device flow:

1. Use a staging device identity.
2. Publish or POST telemetry with `INGEST_SHARED_TOKEN`.
3. Confirm telemetry is inserted into Supabase.
4. Queue a command from the Next.js dashboard.
5. Fetch the command from the worker device endpoint.
6. Ack the command and confirm `command_log` transitions to a terminal state.

Do not promote the worker until `/health`, ingest, command fetch, command ack, and OTA manifest all pass against staging Supabase.
