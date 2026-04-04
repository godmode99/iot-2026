---
id: EX-01-BOOTSTRAP-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [SB-00-TASKS, SB-00-FW-HW, SB-00-BACKEND-SEC, AI-PLAYBOOK-01]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-01 Bootstrap Spec v1.0

## Purpose

This file defines exactly what `EX-01` must produce.

Use it to answer:

- which folders must exist
- which environment variables must be declared
- which starter files must be present
- what counts as a successful bootstrap

## Scope

`EX-01` covers:

- first code workspace creation
- local development bootstrap
- environment and secret inventory
- minimal contracts needed to unlock downstream tasks

It does not require full feature implementation.

## Source Of Truth Rules

- This file is authoritative for `EX-01`.
- If `EX-01` details conflict with the task list, update both files together.
- Do not expand `EX-01` to include sensor logic, production ingest, or dashboard features beyond runnable skeletons.

## Dependencies

- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)

## Objective

Create a repository structure that lets one developer machine start all three future workstreams:

- firmware
- backend
- dashboard

The output must be good enough to immediately unlock:

- `EX-03`
- `EX-06`
- `EX-09`

## Required Repository Structure

At minimum, `EX-01` should create:

```text
firmware/
backend/
dashboard/
shared/
ops/
.env.example
RUNBOOK.md
```

## Required Folder Intent

| Path | Intent |
| --- | --- |
| `firmware/` | ESP-IDF project for `ESP32-S3` firmware |
| `backend/` | telemetry ingest, admin, provisioning, alert, and OTA-related backend logic |
| `dashboard/` | web UI for device list, status, charts, map, and provisioning entry |
| `shared/` | shared schemas, payload definitions, enums, and cross-service types |
| `ops/` | local setup notes, SQL helpers, migration notes, and service checklists |

## Required Bootstrap Outputs

| Output | Required |
| --- | --- |
| bootable firmware skeleton | yes |
| bootable backend skeleton | yes |
| bootable dashboard skeleton | yes |
| `.env.example` | yes |
| secret checklist | yes |
| one-page runbook | yes |
| initial telemetry contract | yes |
| initial device metadata contract | yes |

## Required Environment Variable Groups

The exact final set can grow, but `EX-01` must declare baseline names for the following groups.

### App and URLs

- `NODE_ENV`
- `APP_URL`
- `DASHBOARD_URL`
- `BACKEND_URL`

### Supabase

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### MQTT and Broker

- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `MQTT_TOPIC_PREFIX`

### Notifications

- `LINE_CHANNEL_ACCESS_TOKEN`
- `RESEND_API_KEY`

### Auth and Signing

- `JWT_SECRET`
- `OTA_SIGNING_KEY_PATH`

### Optional Mapping and UX

- `NEXT_PUBLIC_MAP_PROVIDER`
- `NEXT_PUBLIC_MAP_API_KEY`

## Required Secret Checklist Columns

The secret checklist should track at least:

- `secret_name`
- `used_by`
- `owner`
- `local_required`
- `production_required`
- `notes`

## Required Initial Contracts

`EX-01` must define placeholder or starter contracts for the following.

### Device Identity

- `device_id`
- `serial_number`
- `firmware_version`
- `battery_variant`
- `battery_profile_version`

### Device Status

- `last_seen_at`
- `online_state`
- `battery_percent`
- `signal_quality`
- `gps_fix_state`

### Telemetry Payload

- `device_id`
- `timestamp`
- `temperature_c`
- `turbidity_raw`
- `battery_percent`
- `battery_mv`
- `lat`
- `lng`

### MQTT Topic Baseline

- device uplink telemetry topic
- device status topic
- optional command topic placeholder

The naming does not have to be final, but it must be explicit and shared.

## Minimal Boot Criteria

### Firmware

- ESP-IDF project exists
- basic build command exists
- app boots and prints a startup banner or log line

### Backend

- app can start locally
- health or placeholder endpoint exists
- environment loading is validated

### Dashboard

- app can start locally
- placeholder home page exists
- environment loading is validated

## Suggested Starter Files

### Repository Root

- `.env.example`
- `RUNBOOK.md`
- `README.md` update if needed

### Firmware

- project config
- main entrypoint
- config module placeholder
- logging placeholder

### Backend

- app entrypoint
- config loader
- health route
- placeholder ingest module

### Dashboard

- app entrypoint
- landing shell
- placeholder device list page
- config loader

### Shared

- telemetry schema
- device metadata schema
- battery variant enum

## Definition Of Done

`EX-01` is done when all of the following are true:

1. required folders exist with non-empty starter files
2. `.env.example` exists with stable baseline variable names
3. runbook explains how to boot firmware, backend, and dashboard
4. secret checklist exists
5. firmware build command is defined
6. backend starts locally
7. dashboard starts locally
8. shared payload and metadata contracts exist in starter form
9. `EX-03`, `EX-06`, and `EX-09` can begin without redefining structure or env names

## Explicit Non-Goals

- full sensor integration
- production-grade auth
- full dashboard UX
- final MQTT topic design
- OTA implementation
- complete DB schema beyond what `EX-06` will own

## Acceptance Criteria

- A new contributor can clone the repository and understand where each major subsystem belongs.
- Codex can start implementing firmware, backend, and dashboard without recreating project structure decisions.
- Environment variable naming is stable enough for downstream implementation.
- `EX-01` output reduces future ambiguity instead of adding placeholders with no execution path.

## Open Questions

- Whether backend and dashboard should be separate packages or share one monorepo toolchain.
- Whether `shared/` should be TypeScript-first, JSON Schema-first, or doc-first in the first iteration.

## Related Docs

- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
