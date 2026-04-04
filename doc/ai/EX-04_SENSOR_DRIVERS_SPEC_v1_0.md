---
id: EX-04-SENSOR-DRIVERS-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-03-FIRMWARE-SKELETON-SPEC, SB-00-FW-HW]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-04 Sensor Drivers Spec v1.0

## Purpose

This file defines the first sensor integration target on development hardware.

Use it to answer:

- which sensors must be integrated first
- what driver shape is expected
- what counts as valid output for downstream telemetry work

## Scope

`EX-04` covers:

- `DS18B20`
- analog turbidity path
- `MAX17048`
- `L76K`
- sensor fault handling
- sample payload generation from real reads

It does not cover:

- production `SEN0600` RS485 path
- full modem integration
- field calibration strategy

## Source Of Truth Rules

- This file is authoritative for `EX-04`.
- Use the firmware and hardware spec for the sensor baseline and fallback rules.
- Do not skip the analog turbidity path during the first development pass.
- Keep field naming aligned with shared telemetry contracts.

## Dependencies

- [EX-03_FIRMWARE_SKELETON_SPEC_v1_0.md](./EX-03_FIRMWARE_SKELETON_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)

## Objective

Produce repeatable real sensor readings on development hardware and convert them into one canonical telemetry sample shape.

The output must be good enough to unlock:

- `EX-05`
- `EX-07`

## Required Sensor Baseline

| Sensor | Interface | First-pass expectation |
| --- | --- | --- |
| `DS18B20` | OneWire | read temperature successfully and handle missing probe |
| analog turbidity | ADC | read raw analog value and expose simple normalized placeholder if needed |
| `MAX17048` | I2C | read battery percentage and battery voltage |
| `L76K` | UART/NMEA | parse location and GPS fix state |

## Required Driver Shape

Each sensor path should support:

- init
- read
- status or error reporting
- conversion to a shared in-memory representation

Drivers do not need identical code style, but behavior should stay consistent.

## Required Telemetry Fields Produced By EX-04

- `temperature_c`
- `turbidity_raw`
- `battery_percent`
- `battery_mv`
- `lat`
- `lng`
- `gps_fix_state`

## Fault Handling Baseline

First-pass fault handling must support:

- sensor missing at boot
- sensor read timeout or invalid data
- GPS no-fix state
- battery read failure

Failure behavior should:

- keep the system alive
- emit explicit logs
- mark the affected reading as unavailable or invalid in a clear way

## Driver Output Rules

- keep raw values available where useful
- do not hide failed reads as zero without marking them
- convert units into stable dashboard/backend-facing names early
- keep one canonical sample payload builder in firmware

## Recommended Internal Modules

| Module | Responsibility |
| --- | --- |
| `sensors/ds18b20` | temperature init and read |
| `sensors/turbidity_adc` | analog turbidity read |
| `sensors/max17048` | battery percentage and millivolt reads |
| `sensors/l76k` | NMEA parse and GPS status |
| `telemetry/sample_builder` | merge sensor outputs into one sample payload |

## Suggested Sample Payload Output

The firmware should be able to log or return one sample shaped roughly like:

- `device_id`
- `timestamp`
- `temperature_c`
- `turbidity_raw`
- `battery_percent`
- `battery_mv`
- `lat`
- `lng`
- `gps_fix_state`

The exact serialization can stay local for now, but field names should align with later ingest.

## Non-Goals

- final calibration math
- RS485 `SEN0600`
- geofence behavior
- publish retry logic

## Definition Of Done

`EX-04` is done when all of the following are true:

1. all four required Phase 1 sensor paths initialize or fail explicitly
2. firmware can read each required sensor on dev hardware
3. sample telemetry output exists with real values where hardware is available
4. sensor read failures are logged and handled without crashing the main cycle
5. `EX-05` can package these readings for publish without redefining field names

## Acceptance Criteria

- Required Phase 1 sensors are readable on development hardware.
- One canonical sample payload exists for downstream connectivity work.
- Fault handling is explicit and non-destructive.

## Open Questions

- Whether turbidity normalization should start now or wait until backend/dashboard work needs it.
- Whether GPS parsing should store both raw NMEA fragments and normalized fields in early debug builds.

## Related Docs

- [EX-03_FIRMWARE_SKELETON_SPEC_v1_0.md](./EX-03_FIRMWARE_SKELETON_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
