---
id: SB-00-BACKEND-SECURITY
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-MASTER, SB-00-DECISIONS]
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Backend And Security Spec

## Purpose

This file defines the backend, dashboard, and security baseline for SB-00.

Use it to align:

- telemetry ingest
- data model
- dashboard behavior
- alerting
- OTA/API security
- pilot operations

## Scope

This specification covers the application-side architecture from device ingress through dashboard and operations.

It does not define low-level firmware behavior or business pricing decisions.

## Source Of Truth Rules

- Use this file for backend architecture and security behavior.
- Use the master assumptions file for shared baseline values and compliance stance.
- Use the decision register for provisioning and sourcing decisions that affect backend flow.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)

## System Architecture

### Baseline Stack

| Layer | Baseline |
| --- | --- |
| Frontend and API | `Next.js` |
| Hosting | `Vercel` |
| Database | `Supabase Postgres` |
| Auth | `Supabase Auth` |
| Message broker | `HiveMQ Cloud` |
| Cache / queue / rate limit | `Upstash` services when needed |
| Notifications | `LINE Messaging API`, `Resend`, web/in-app |
| Monitoring | logging plus production monitoring stack |

### Core Flow

`Device -> MQTT broker -> backend ingest -> database -> dashboard / alerting / OTA control`

## Required Backend Capabilities

| Capability | Requirement |
| --- | --- |
| Telemetry ingest | consume device telemetry from MQTT path and persist it |
| Latest status | maintain latest device status separately from telemetry history |
| Dashboard data | support latest, map, chart, and device-list views |
| Alerting | support threshold, offline, low-battery, and sensor fault alerts |
| Provisioning | support `QR + Web/PWA` registration and device-to-farm binding |
| OTA control | support release metadata and authorized push actions |
| Ops hardening | support logging, retry, backup, and pilot issue handling |

## Data Model Baseline

### Core Entities

| Entity | Purpose |
| --- | --- |
| `farms` | customer farm boundary |
| `devices` | per-device identity and configuration |
| `telemetry` | time-series sensor data |
| `device_status` or latest status view | last-known state for dashboard |
| `alerts` | active and historical alert records |
| `command_log` | audit trail for device commands and OTA actions |

### Device Metadata Requirements

The `devices` record must support at least:

- device identity
- provisioning state
- farm binding
- current interval
- battery metadata:
  - `battery_variant`
  - `battery_profile_version`
  - `usable_capacity_mah`

## Provisioning Baseline

### Customer Flow

Customer provisioning must use one flow only:

- scan QR
- open web/PWA page
- register or bind device
- link device to farm/account

### Explicit Exclusions

- `BLE provisioning` is not part of the customer baseline.
- native mobile app is not part of the baseline.
- USB/QC tools are internal-only.

## Security Baseline

### Authentication

| Area | Baseline |
| --- | --- |
| User auth | `Supabase Auth` |
| Session model | JWT-based authenticated application sessions |
| Service-to-service actions | service credentials only where required |
| Device-facing actions | device credentials or backend-validated ingest path |

### Authorization

- Use row-level access control so users only access their own farm data.
- Keep destructive or high-impact actions behind owner/admin roles.
- Maintain auditable command and OTA history.

### OTA Authorization Baseline

| Route | Required auth |
| --- | --- |
| `/api/ota/releases` `POST` | `SVC` |
| `/api/ota/push` `POST` | `JWT (owner/admin)` |
| `/api/ota/push/batch` `POST` | `SVC` |

### Security Rules

- Customer provisioning must not branch by device type or browser family.
- Release metadata and OTA actions must be authenticated and logged.
- Secrets must stay out of client bundles and source control.
- Pilot operations must retain enough logs to debug failed ingest, alerting, and OTA events.

## Ingest And Dashboard Behavior

### Telemetry Ingest Requirements

- accept valid telemetry payloads from the MQTT path
- persist raw telemetry
- update latest device status
- preserve device identity and timestamp integrity
- tolerate reconnect and delayed flush behavior from devices

### Dashboard MVP Requirements

- device list
- latest values
- online/offline status
- map view for device location
- historical chart view
- battery variant and runtime-facing status

## Alerting Baseline

### Required Alert Types

- threshold above/below
- offline
- low battery
- sensor fault

### Alerting Rules

- suppress duplicate active alerts
- resolve alerts when the condition clears
- allow notification through LINE, email, web, or in-app path
- battery alerts should respect battery profile thresholds

## Pilot Operations Baseline

Pilot-ready backend operations must include:

- application logs
- retry handling for failed jobs
- backup or export path
- issue log process
- enough observability to diagnose ingest, notification, and OTA failures

## Implementation Priorities

1. schema and migrations
2. ingest path
3. latest status query path
4. dashboard MVP
5. alert MVP
6. QR provisioning flow
7. OTA and hardening

## Acceptance Criteria

- Real telemetry can flow from broker to backend to database.
- Latest device status is queryable for dashboard use.
- Device provisioning uses one customer-facing flow only.
- Battery metadata is stored and usable by dashboard and alert logic.
- OTA routes and sensitive actions are protected by the required auth baseline.

## Open Questions

- Whether latest device status should live in a physical table or a materialized/latest view pattern.
- Whether pilot reporting/export should be implemented as a background job from day one.

## Related Docs

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
