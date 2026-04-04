---
id: EX-06-SCHEMA-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-01-BOOTSTRAP-SPEC, SB-00-BACKEND-SECURITY, SB-00-BATTERY-PROFILES]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-06 Schema And Migrations Spec v1.0

## Purpose

This file defines the first database schema and migration target for the application stack.

Use it to answer:

- which tables must exist first
- which fields are required to unlock ingest and dashboard work
- what level of security and RLS is required in the first pass

## Scope

`EX-06` covers:

- initial schema design
- migration files
- baseline row-level security
- starter indexes and query paths for the dashboard MVP

It does not cover:

- every future reporting table
- full production analytics modeling
- final alerting automation logic

## Source Of Truth Rules

- This file is authoritative for `EX-06`.
- Use the backend security spec for architecture and security baseline.
- Use the battery profile and interface docs for battery-related fields.
- Schema names and column names defined here should remain stable once implementation starts.

## Dependencies

- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)

## Objective

Create the first Supabase/Postgres schema that supports:

- device identity
- farm ownership boundaries
- telemetry history
- latest device status
- alert records
- command and OTA audit trail

The output must be good enough to unlock:

- `EX-07`
- `EX-09`
- `EX-11`

## Required Core Tables

`EX-06` should create at least:

- `farms`
- `devices`
- `telemetry`
- `device_status`
- `alerts`
- `command_log`

## Required Table Intent

| Table | Purpose |
| --- | --- |
| `farms` | tenant boundary for customer data |
| `devices` | identity, binding, battery metadata, provisioning state |
| `telemetry` | append-only historical readings |
| `device_status` | last-known status for fast dashboard queries |
| `alerts` | active and historical alert state |
| `command_log` | audit trail for commands, OTA, and administrative device actions |

## Required Columns

### `farms`

- `id`
- `name`
- `owner_user_id`
- `created_at`

### `devices`

- `id`
- `device_id`
- `serial_number`
- `farm_id`
- `provisioning_state`
- `firmware_version`
- `publish_interval_sec`
- `battery_variant`
- `battery_profile_version`
- `usable_capacity_mah`
- `created_at`
- `updated_at`

### `telemetry`

- `id`
- `device_id`
- `recorded_at`
- `temperature_c`
- `turbidity_raw`
- `battery_percent`
- `battery_mv`
- `lat`
- `lng`
- `payload_json`
- `created_at`

### `device_status`

- `device_id`
- `last_seen_at`
- `online_state`
- `battery_percent`
- `battery_mv`
- `signal_quality`
- `gps_fix_state`
- `last_lat`
- `last_lng`
- `updated_at`

### `alerts`

- `id`
- `device_id`
- `farm_id`
- `alert_type`
- `status`
- `severity`
- `opened_at`
- `resolved_at`
- `details_json`

### `command_log`

- `id`
- `device_id`
- `command_type`
- `requested_by`
- `request_source`
- `status`
- `requested_at`
- `completed_at`
- `details_json`

## Required Constraints

- `devices.device_id` must be unique
- `devices.serial_number` should be unique
- `device_status.device_id` should be unique
- foreign keys must connect `devices` to `farms`
- foreign keys must connect dependent tables to `devices`

## Required Index Baseline

At minimum:

- index on `telemetry(device_id, recorded_at desc)`
- index on `alerts(device_id, status)`
- index on `devices(farm_id)`
- index on `device_status(last_seen_at)`

## RLS Baseline

First-pass RLS must support:

- users can access only rows associated with their farm ownership
- service-role or trusted backend path can ingest and update device records
- direct customer access to sensitive audit or service paths should remain restricted

The exact policy implementation can be simple in the first pass, but the trust boundary must be explicit.

## Query Paths That Must Be Supported

The schema must support these downstream needs:

- list devices per farm
- fetch latest status per device
- fetch telemetry history per device
- open device details page
- inspect active alerts
- bind a device to a farm during provisioning

## Migration Output Requirements

`EX-06` should leave behind:

- initial migration SQL files
- one short schema note or README
- one clear command to apply migrations locally
- optional seed or sample-data approach if needed for dashboard scaffolding

## Non-Goals

- full billing schema
- advanced reporting warehouse
- complete notification delivery log system
- final production retention policy

## Definition Of Done

`EX-06` is done when all of the following are true:

1. initial migration files exist
2. required core tables exist
3. required device battery metadata fields exist
4. baseline indexes exist for dashboard MVP and ingest
5. first-pass RLS is present and aligned with farm boundaries
6. migrations can run locally
7. `EX-07`, `EX-09`, and `EX-11` can build on the schema without renaming core entities

## Acceptance Criteria

- Schema covers the minimum core entities from the backend baseline.
- Battery metadata is first-class in the device model.
- RLS protects tenant boundaries at a minimum viable level.
- Downstream ingest and dashboard work can proceed without schema reinterpretation.

## Open Questions

- Whether `device_status` should remain a physical table or later become a derived/latest-state pattern.
- Whether farm membership should support multiple users in the first version or later.

## Related Docs

- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
