# EX-19 / EX-22 Ops Hardening

## OTA Baseline

- OTA manifest is resolved from `ops/ota-releases.json`
- Default channel is `stable`
- Device requests must provide `device_id` and `current_version`
- Use `INGEST_SHARED_TOKEN` to protect `GET /api/ota/manifest`
- `sha256` and release URL must be replaced with real artifact values before pilot

## Admin Baseline

- Admin APIs should use `ADMIN_API_TOKEN`
- Local development may fall back to `x-actor-user-id` only when `ADMIN_ALLOW_INSECURE_DEV=true`
- Device commands are written to `command_log` with `queued` status for downstream delivery

## Current Admin Endpoints

- `GET /api/admin/command-log`
- `POST /api/admin/devices/:deviceId/commands`
- `GET /api/ota/manifest`
- `GET /api/device/commands`
- `POST /api/device/commands/:commandId/ack`

## Next Steps

- Replace `ADMIN_API_TOKEN` with real session-backed admin auth
- Add command delivery worker and command acknowledgement path from devices
- Add OTA rollout cohorts, staged rollout percentages, and rollback state
- Store firmware binaries and checksums in a trusted artifact bucket
