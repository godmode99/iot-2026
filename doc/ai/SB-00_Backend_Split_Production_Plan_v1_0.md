---
id: SB-00-BACKEND-SPLIT-PRODUCTION-PLAN
type: architecture
status: active
owners: [Pon, Codex]
depends_on:
  - SB-00-FRONTEND-APP-PLAN
  - SB-00-FULLSTACK-PRODUCTION-PLAN
source_of_truth: true
last_updated: 2026-04-07
---

# Backend Split Production Plan

## Purpose

Define the production split between the Vercel-hosted Next.js web backend and the separate device/worker backend.

## Decision

Use a split backend:

- `Next.js Web Backend` on Vercel for browser-facing product flows.
- `Device Worker Backend` on Cloud Run or Fly.io for device ingest, MQTT, and long-running jobs.
- `Supabase Auth + Postgres + RLS` remains the shared source of truth.

## Next.js Web Backend Scope

Move these flows into Next.js server actions, route handlers, or RLS-backed server components:

- Login/session and route guards.
- Customer dashboard reads.
- Farm creation and farm settings.
- Farm member invite and invite acceptance.
- Reseller assignment within farm scope.
- Notification preferences.
- QR + Web/PWA provisioning.
- Customer/admin command queue actions.
- Customer/admin alert actions.
- Audit log views.
- Operator overview.

Use Supabase RLS for normal reads. Use server-only privileged access only for actions that require elevated writes, cross-user audit data, or `auth.users` metadata.

## Device Worker Backend Scope

Keep these flows outside Next.js and deploy as a separate worker service:

- Telemetry ingest from devices.
- MQTT subscriber/publisher bridge.
- Device command delivery/ack bridge.
- Offline checks and scheduled alert evaluation.
- Notification dispatch worker.
- OTA rollout/rollback worker.
- Long-running retry/queue processing.

## Production Hosting Baseline

Use `Cloud Run` as the default production target for the device worker backend because it has strong container deployment, IAM, secrets, and scaling controls.

Keep `Fly.io` as an acceptable alternate target if team operations favor simpler VM-like process management.

## Migration Phases

1. Move provisioning web flow into Next.js.
2. Move farm settings actions and reads into Next.js.
3. Move device command and alert action flows into Next.js.
4. Remove `BACKEND_URL` from dashboard staging requirements.
5. Rename/package the old Node backend as `device-worker`.
6. Add worker Dockerfile and Cloud Run/Fly deployment runbook.
7. Add MQTT broker and worker deployment only when hardware/device tests begin.

## Acceptance Criteria

- Dashboard staging can run without a deployed Node backend for browser-facing flows.
- `BACKEND_URL` is not required for customer/admin web flows.
- Device/MQTT flows remain explicit and are not hidden inside Vercel serverless routes.
- Service role and database URLs are server-only and never exposed through `NEXT_PUBLIC_*`.
- Worker deployment can be delayed until MQTT/device testing starts.

## Phase 1 Status

Provisioning web flow has been moved into the Next.js server-side layer. The dashboard deployment now needs `SUPABASE_DB_URL` as a server-only environment variable for provisioning writes.
