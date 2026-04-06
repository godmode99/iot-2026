# EX-07 Ingest Hardening

## Goal

Raise the telemetry ingest path from local MVP to production-oriented baseline before real hardware arrives.

## Current Controls

- `INGEST_SHARED_TOKEN` protects `POST /api/ingest/telemetry`
- `INGEST_ALLOW_INSECURE_DEV=true` is allowed only for local development convenience
- Every backend response now includes `requestId`
- Ingest logs include `requestId`, `deviceId`, duplicate flag, auth mode, and remote address
- Device status upsert is monotonic and will not regress when older telemetry arrives late
- Retired devices are rejected at the ingest service layer

## Production Checklist

- Set `NODE_ENV=production`
- Set a strong `INGEST_SHARED_TOKEN`
- Set `INGEST_ALLOW_INSECURE_DEV=false`
- Ensure devices publish with `Authorization: Bearer <token>` or `x-ingest-token`
- Forward backend stdout/stderr into centralized logs
- Keep `x-request-id` from edge or load balancer if available
- Monitor duplicate rate, `device_unknown`, `topic_invalid`, and auth failures

## Suggested Metrics

- ingest accepted count
- ingest duplicate count
- ingest auth failure count
- ingest payload validation failure count
- ingest unknown device count
- device status stale/offline count

## Next Hardening Steps

- Move from one shared token to per-device credentials or signed payloads
- Add rate limiting at edge or reverse proxy
- Add dead-letter storage for rejected payloads that should be replayed
- Add notification delivery integrations for critical alert classes
