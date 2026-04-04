---
id: EX-09-DASHBOARD-MVP-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-06-SCHEMA-SPEC, EX-07-INGEST-SPEC, SB-00-BACKEND-SECURITY]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-09 Dashboard MVP Spec v1.0

## Purpose

This file defines the first dashboard implementation that should sit on top of real device and telemetry data.

Use it to answer:

- what pages and views must exist first
- what data each view depends on
- what level of polish is required in MVP

## Scope

`EX-09` covers:

- device list
- latest value cards
- online/offline state
- map view
- historical chart view
- battery variant visibility

It does not cover:

- final visual polish
- advanced reporting
- full alert management UI

## Source Of Truth Rules

- This file is authoritative for `EX-09`.
- Use the backend and schema specs for data model expectations.
- Keep the first dashboard tied to real ingest output, not mock-only UI.

## Dependencies

- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)

## Objective

Provide the first working web dashboard that can show current device state and recent history for a small pilot-sized device set.

The output must be good enough to unlock:

- `EX-10`
- `EX-15`

## Required Views

### Device List

Must show at minimum:

- device name or serial
- online/offline state
- latest temperature
- latest battery percent
- last seen time

### Device Detail

Must show at minimum:

- latest values card
- device location on map
- recent telemetry chart
- battery variant label
- firmware version if available

## Required Data Surfaces

The dashboard must consume:

- `devices`
- `device_status`
- `telemetry`

It may also surface:

- `alerts` summary

## Required UI Rules

- prefer simple, fast, readable views over polish-heavy layout
- online/offline state must be visually obvious
- map should tolerate missing GPS gracefully
- charts should use real telemetry history, even if minimal
- battery variant should be visible as `Standard` or `Long-Life`

## Required MVP Query Paths

- list devices for a farm
- fetch latest status for one device
- fetch telemetry history by device and time range

## Battery Metadata Behavior

The dashboard should display:

- `battery_variant`
- current `battery_percent`
- optionally a first-pass runtime estimate if the data path is ready

If runtime estimate is not yet implemented, the battery variant still must be visible.

## Empty And Failure States

The first version must handle:

- no devices
- device with no GPS
- device with no recent telemetry
- temporarily unavailable data source

These states should be explicit and readable, not blank screens.

## Non-Goals

- full design system
- complex admin workflows
- multi-tenant management UI beyond the current farm scope
- alert configuration editor

## Definition Of Done

`EX-09` is done when all of the following are true:

1. dashboard can start locally
2. device list is backed by real schema/query paths
3. device detail shows latest values
4. map view works when coordinates are available
5. historical chart shows real telemetry history
6. online/offline state is visible
7. battery variant is visible for each device detail flow

## Acceptance Criteria

- Dashboard reflects real device and telemetry data.
- MVP views cover the minimum operational needs for prototype and field testing.
- Battery metadata is visible to users and support staff.

## Open Questions

- Whether the first dashboard should be server-rendered, client-fetched, or mixed.
- Whether charts should default to 24-hour history or a shorter window.

## Related Docs

- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
