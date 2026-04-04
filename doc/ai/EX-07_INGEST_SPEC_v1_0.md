---
id: EX-07-INGEST-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-05, EX-06-SCHEMA-SPEC, SB-00-BACKEND-SECURITY]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-07 Ingest Path Spec v1.0

## Purpose

This file defines the first end-to-end ingest implementation after firmware publish and schema setup exist.

Use it to answer:

- what the backend ingest path must do
- which data transformations are required
- what storage side effects must happen for each payload

## Scope

`EX-07` covers:

- MQTT-to-backend ingest path
- payload validation
- telemetry persistence
- latest device status updates
- minimal failure handling for delayed or repeated payloads

It does not cover:

- full alert engine
- full OTA command handling
- complete analytics or export behavior

## Source Of Truth Rules

- This file is authoritative for `EX-07`.
- Use the schema spec for table and field names.
- Use the backend security spec for trust boundaries and authorization assumptions.
- Do not redesign the telemetry contract inside ingest if it already exists in shared contracts.

## Dependencies

- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)

## Objective

Create the first reliable ingest path that takes valid device telemetry and makes it available for the dashboard MVP.

The output must be good enough to unlock:

- `EX-09`
- `EX-10`
- `EX-11`

## Required Flow

The first-pass ingest path should follow:

`MQTT message -> payload validation -> device lookup -> telemetry insert -> device_status upsert -> ingest log or error path`

## Required Inputs

The ingest path must accept a payload containing at minimum:

- `device_id`
- `timestamp`
- `temperature_c`
- `turbidity_raw`
- `battery_percent`
- `battery_mv`
- `lat`
- `lng`

It may also accept optional metadata such as:

- `firmware_version`
- `signal_quality`
- `gps_fix_state`
- `battery_variant`

## Required Processing Steps

### Validation

- reject malformed payloads
- reject payloads missing `device_id` or `timestamp`
- normalize numeric fields where practical
- keep a clear error path for invalid messages

### Device Resolution

- find the device by canonical `device_id`
- fail explicitly if the device is unknown
- do not silently create customer-facing device records during ingest

### Telemetry Persistence

- write the raw reading into `telemetry`
- preserve device ID and recorded timestamp
- keep room for raw payload JSON when useful

### Latest Status Update

- update or upsert the device row in `device_status`
- set `last_seen_at`
- update battery, location, and online-facing status
- prefer one explicit upsert path rather than scattered updates

## Required Output Effects

Each valid payload should result in:

1. one historical telemetry record
2. one latest-status update for the device
3. one clear success/failure logging event

## Required Failure Handling

The first version should handle:

- invalid payload shape
- unknown device
- duplicate or repeated deliveries
- delayed delivery from offline buffer flush
- database write failure

The exact retry system can stay minimal, but failure paths must be visible and diagnosable.

## MQTT Topic Baseline

The exact naming may still evolve, but `EX-07` must document one initial topic baseline for:

- telemetry uplink
- device status uplink if separated
- future command downlink placeholder

## Trust Boundary Baseline

The ingest path should run through a trusted backend/service boundary, not direct client-side writes.

At minimum:

- device-originated ingest must not require end-user client credentials
- database write privileges for ingest should remain server-side
- ingest actions should be auditable in logs

## Minimal Observability

The first version should log:

- payload accepted
- payload rejected
- device unknown
- telemetry write failed
- status upsert failed

Logs do not need full production formatting yet, but they must support debugging.

## Suggested Internal Modules

| Module | Responsibility |
| --- | --- |
| `ingest/validator` | shape validation and normalization |
| `ingest/topic-parser` | topic-to-message routing |
| `ingest/repository` | telemetry insert and status upsert |
| `ingest/service` | orchestration and logging |

## Non-Goals

- full alert creation logic
- historical dedup optimization
- device command processing
- geofence logic
- export/report jobs

## Definition Of Done

`EX-07` is done when all of the following are true:

1. backend can receive a valid telemetry payload from the MQTT path or equivalent local entrypoint
2. valid payload inserts one row into `telemetry`
3. valid payload updates one row in `device_status`
4. invalid payloads fail explicitly with logs
5. unknown devices fail explicitly with logs
6. delayed payloads preserve their original recorded timestamp
7. dashboard work can query real latest status and history data

## Acceptance Criteria

- Real telemetry can flow into storage and latest status state.
- Ingest behavior aligns with the backend security and schema baseline.
- Logging is sufficient to debug the first end-to-end prototype path.
- The result is stable enough for dashboard MVP work to consume.

## Open Questions

- Whether ingest should subscribe directly to MQTT broker events or use an intermediate webhook/bridge layer.
- Whether duplicate detection should be introduced in the first version or later.

## Related Docs

- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
