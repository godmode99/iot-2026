---
id: EX-10-ALERTS-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-07-INGEST-SPEC, EX-09-DASHBOARD-MVP-SPEC, SB-00-BACKEND-SECURITY, SB-00-BATTERY-PROFILES]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-10 Alerts MVP Spec v1.0

## Purpose

This file defines the first alerting implementation for prototype and pilot preparation.

Use it to answer:

- which alert types must exist first
- what alert state transitions are required
- what notification behavior is required in MVP

## Scope

`EX-10` covers:

- threshold alerts
- offline alerts
- low-battery alerts
- sensor fault alerts
- duplicate suppression
- resolve behavior
- notification stubs or first integrations

It does not cover:

- complex alert rule builders
- full escalation policies
- per-farm notification preference management

## Source Of Truth Rules

- This file is authoritative for `EX-10`.
- Use the backend security spec for alert categories and system boundaries.
- Use the battery profile table for battery threshold behavior.
- Keep alert logic simple and explicit in the first version.

## Dependencies

- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
- [EX-09_DASHBOARD_MVP_SPEC_v1_0.md](./EX-09_DASHBOARD_MVP_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)

## Objective

Create the first alert pipeline that can identify important device conditions and record or notify them without generating noisy duplicates.

The output must be good enough to unlock:

- `EX-15`
- `EX-22`

## Required Alert Types

The first version must support:

- threshold above or below
- offline
- low battery
- sensor fault

## Required State Model

Each alert should support at minimum:

- `open`
- `resolved`

Optional future states can be added later, but MVP should keep the state model small.

## Required Rules

### Threshold Alert

- trigger when a configured value crosses a defined threshold
- resolve when the value returns to a safe range

### Offline Alert

- trigger when `last_seen_at` exceeds the acceptable freshness window
- resolve when telemetry resumes

### Low-Battery Alert

- trigger using the active battery profile thresholds
- use `low_battery_warn_pct` and `low_battery_critical_pct` from canonical profiles

### Sensor Fault Alert

- trigger when ingest or device status indicates a sensor read failure or invalid sample
- resolve when valid readings resume

## Required Duplicate Suppression

The first version must avoid creating repeated active alerts for the same:

- device
- alert type
- currently open condition

One condition should create one active alert until it resolves.

## Required Notification Paths

MVP must support at least one or more of these paths:

- `LINE`
- email
- web or in-app stub

It is acceptable if one path is fully wired first and others remain structured stubs, as long as alert state logic is complete.

## Required Data Effects

Each alert event should:

- create or update an `alerts` record
- preserve `opened_at`
- set `resolved_at` when resolved
- keep enough detail to explain why it triggered

## Minimal Dashboard Surface

The dashboard or admin surface should be able to:

- list open alerts
- show alert type and current status
- indicate when an alert resolved

## Non-Goals

- user-configurable rule builder
- multi-step escalation chains
- per-role on-call routing

## Definition Of Done

`EX-10` is done when all of the following are true:

1. all four required alert categories exist
2. alerts can open and resolve correctly
3. duplicate active alerts are suppressed
4. battery alerts use the active battery profile thresholds
5. at least one notification path or structured stub is functional
6. active alerts are visible to support or dashboard flows

## Acceptance Criteria

- Alert state changes are explicit and auditable.
- Duplicate alert spam is prevented at MVP level.
- Battery and offline alert behavior aligns with the locked baseline.

## Open Questions

- Whether threshold rules should live in code or a simple database config in the first version.
- Whether offline alert timing should vary by battery-saving interval profile.

## Related Docs

- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
- [EX-09_DASHBOARD_MVP_SPEC_v1_0.md](./EX-09_DASHBOARD_MVP_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
