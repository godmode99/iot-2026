---
id: EX-03-FIRMWARE-SKELETON-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-01-BOOTSTRAP-SPEC, SB-00-FW-HW, SB-00-BATTERY-PROFILES]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-03 Firmware Skeleton Spec v1.0

## Purpose

This file defines the first firmware implementation target after workspace bootstrap.

Use it to answer:

- what the ESP-IDF firmware skeleton must include
- how the firmware should be structured before sensor integration
- what counts as a successful `EX-03` result

## Scope

`EX-03` covers:

- ESP-IDF project creation
- boot and configuration flow
- NVS-backed config storage
- scheduler skeleton
- watchdog wiring
- structured logging
- battery profile awareness at metadata level

It does not cover:

- real sensor drivers
- real MQTT payload publishing
- OTA implementation beyond placeholders

## Source Of Truth Rules

- This file is authoritative for `EX-03`.
- Use the firmware and hardware spec for baseline device constraints.
- Use the battery profile spec for any battery metadata defaults.
- Do not add sensor-specific or modem-specific behavior here unless required for a bootable skeleton.

## Dependencies

- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)

## Objective

Create a bootable `ESP-IDF` firmware project for `ESP32-S3` that establishes the long-term runtime structure without yet depending on real peripherals.

The skeleton must be good enough to unlock:

- `EX-04`
- `EX-05`

## Required Project Shape

`firmware/` should contain at least:

```text
firmware/
  CMakeLists.txt
  sdkconfig.defaults
  main/
    CMakeLists.txt
    app_main.c or app_main.cpp
  components/
    config/
    health/
    telemetry/
    battery/
    scheduler/
    logging/
```

The exact language can be `C` or `C++`, but the initial project should stay simple and consistent.

## Required Responsibilities

### Boot

- initialize NVS
- initialize logging
- load persisted config
- validate config
- print a boot summary

### Config

- define one persisted config structure
- support load from NVS
- support save to NVS
- support default values on first boot

### Scheduler

- define one explicit read/publish/sleep cycle model
- provide placeholder task or state-machine hooks for later sensor and network work
- avoid hidden timing logic spread across modules

### Watchdog

- enable watchdog support
- expose one clear feed path in the main runtime flow
- log watchdog-related failures where practical

### Telemetry Placeholder

- define one in-memory telemetry struct
- support sample payload generation with placeholder values
- align field names with `EX-01` shared contracts

### Battery Metadata

- support `battery_variant`
- support `battery_profile_version`
- support `usable_capacity_mah`
- default to `standard` profile unless config says otherwise

## Recommended Internal Modules

| Module | Responsibility |
| --- | --- |
| `config` | persisted config schema, load/save, defaults |
| `logging` | boot log format and helper macros |
| `scheduler` | cycle orchestration |
| `battery` | battery profile selection and thresholds |
| `telemetry` | payload struct and placeholder sample creation |
| `health` | uptime, reboot reason, fault markers |

## Required Config Fields

The initial persisted config should support at least:

- `device_id`
- `serial_number`
- `firmware_version`
- `battery_variant`
- `battery_profile_version`
- `publish_interval_sec`
- `night_interval_sec`
- `mqtt_topic_prefix`

These fields can start as placeholders but names should be stable.

## Required Boot Summary

At startup, firmware should log at least:

- app name
- firmware version
- reset or boot reason
- loaded battery variant
- loaded publish interval
- whether config was loaded or defaulted

## Required Failure Behavior

- if NVS init fails, log clearly and fail fast or recover explicitly
- if config is missing, fall back to defaults and log that path
- if config is invalid, log validation failure and choose explicit fallback behavior

## Non-Goals

- full GPIO map
- real DS18B20 or turbidity integration
- real modem init
- real MQTT connection
- OTA transport and rollback logic

## Definition Of Done

`EX-03` is done when all of the following are true:

1. `firmware/` contains a valid ESP-IDF project
2. project configuration builds successfully
3. app boots on target or at minimum passes build and startup structure review
4. NVS-backed config load and save paths exist
5. boot summary log exists
6. scheduler placeholder exists for read/publish/sleep flow
7. battery profile metadata exists and defaults to the canonical `standard` profile
8. `EX-04` and `EX-05` can plug sensor and modem work into the skeleton without restructuring it

## Acceptance Criteria

- Firmware structure reflects the runtime model from the firmware baseline.
- Config, scheduler, watchdog, and logging are established before sensor and modem work.
- Battery metadata is aligned with the canonical battery profile table.
- The skeleton is runnable or buildable, not just a folder placeholder.

## Open Questions

- Whether the initial implementation should use `C` or `C++`.
- Whether the scheduler should start as FreeRTOS tasks or a simpler explicit loop/state machine.

## Related Docs

- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
