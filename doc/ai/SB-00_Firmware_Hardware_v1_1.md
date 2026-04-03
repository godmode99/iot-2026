---
id: SB-00-FW-HW
type: spec
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS]
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Firmware And Hardware Spec

## Purpose

This file defines the implementation baseline for the SB-00 device platform across:

- firmware architecture
- hardware architecture
- sensor interfaces
- battery platform integration
- enclosure and production constraints

## Scope

This specification covers the shared device architecture for prototype, pilot, and the first production-oriented PCB iteration.

It does not replace:

- business planning
- procurement costing
- dashboard or backend implementation detail

## Source Of Truth Rules

- Use this file for device-side implementation behavior and physical architecture.
- Use the master assumptions file for shared baseline and runtime targets.
- Use the decision register for locked choice rationale.
- If a hardware or firmware choice conflicts with a closed decision, update the decision flow first.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)

## System Summary

SB-00 is a mobile water-quality sensor box for pond deployment.

The device platform must support:

- floating or stake-based field deployment
- temperature, turbidity, GPS, and battery telemetry
- `MQTT over 4G/TLS`
- deep-sleep operation
- QR-based customer provisioning
- optional `Long-Life` battery upgrade without changing core firmware or customer flow

## Locked Hardware Baseline

| Area | Baseline |
| --- | --- |
| Main MCU | `ESP32-S3` |
| Phase 1 dev hardware | `FS-HCore-A7670C` |
| Production 4G default | `A7670E` |
| Production 4G fallback | `SIM7670E` only under D-04 conditions |
| GPS default | `L76K` |
| GPS fallback | `NEO-M8N` only under D-02 trigger |
| Temperature sensor | `DS18B20` waterproof probe |
| Turbidity Phase 1 | analog turbidity sensor for dev/test |
| Turbidity Phase 2+ | `DFRobot SEN0600 (RS485)` |
| Battery platform | shared core module with `Standard` and optional `Long-Life` variants |
| Standard enclosure baseline | `150 x 100 x 60 mm` external size |

## Firmware Architecture

### Runtime Model

Firmware should be organized around a small set of explicit responsibilities:

1. boot and configuration
2. sensor read cycle
3. network and publish cycle
4. local buffering and retry
5. power management and sleep
6. diagnostics and fault handling

### Required Firmware Capabilities

| Capability | Requirement |
| --- | --- |
| Config storage | use NVS for persistent device configuration |
| Logging | structured boot and error logging |
| Scheduling | deterministic cycle scheduling for read, publish, and sleep |
| Watchdog | recover from deadlock or stalled tasks |
| Offline behavior | buffer payloads locally and flush after reconnect |
| OTA | support signed firmware update and rollback path |
| Power behavior | support deep sleep and battery-aware intervals |

### Recommended Internal Modules

- `config`
- `sensors`
- `gps`
- `modem`
- `mqtt`
- `buffer`
- `battery`
- `ota`
- `telemetry`
- `commands`
- `health`

## Sensor And Protocol Interfaces

| Function | Interface | Baseline |
| --- | --- | --- |
| Temperature | OneWire | `DS18B20` |
| Turbidity Phase 1 | ADC | analog development path only |
| Turbidity Phase 2+ | RS485 / Modbus RTU | `SEN0600` |
| GPS | UART / NMEA | `L76K` default |
| Fuel gauge | I2C | `MAX17048` |
| 4G modem | UART / AT commands | FS-HCore in prototype, `A7670E` in production |

Rules:

- Firmware must support the analog turbidity path for early integration work.
- Production-oriented firmware must support the `SEN0600` RS485 path.
- GPS parser should remain compatible with both `L76K` and `NEO-M8N`.

## Connectivity Baseline

### Publish Path

`Sensors -> Firmware -> MQTT over 4G/TLS -> Broker -> Backend`

### Connectivity Requirements

| Item | Requirement |
| --- | --- |
| Protocol | MQTT over TLS |
| Delivery | QoS1 publish |
| Reconnect | automatic reconnect after 4G recovery |
| Offline handling | local buffer and later flush |
| Time sync | synchronize time when network is available |

### Modem Fallback Rule

Use `SIM7670E` only when:

- `A7670E` is unavailable, or
- lead time exceeds 14 days, or
- price delta exceeds 20 percent

and only after bench validation passes for:

- power-up
- MQTT over TLS
- OTA flow

## GPS Baseline

### Default Choice

Use `L76K` as the default GPS module for prototype and pilot.

### Fallback Trigger

Switch to `NEO-M8N` only when any of these conditions is hit:

- median TTFF after wake > 60 seconds
- stationary open-sky error > 15 meters for more than 10 percent of samples
- geofence false alert > 2 events per device per week

## Battery Platform Integration

### Shared Product Strategy

The device platform uses:

- one shared core module
- one shared firmware codebase
- one shared provisioning flow
- two battery variants: `Standard` and `Long-Life`

### Battery Variant Targets

| Variant | Target |
| --- | --- |
| `Standard` | `>= 12 days @ 5-minute interval` |
| `Long-Life` | `>= 30 days @ 5-minute interval` or `>= 60 days @ 10-minute interval` |

### Firmware Fields

Firmware must support:

- `battery_variant`
- `battery_profile_version`
- `usable_capacity_mah`
- variant-specific warning and critical thresholds

### Runtime Rules

- Runtime estimation must use the active battery profile.
- Battery alerts must be profile-aware.
- `Long-Life` must not create a separate firmware branch.

## Enclosure And Mechanical Constraints

| Item | Constraint |
| --- | --- |
| Standard baseline size | `150 x 100 x 60 mm` |
| Shared positions | core board mount, antenna bulkhead, sensor exits, QR label |
| Long-Life expansion | battery bay or rear housing section only |
| Waterproofing strategy | main sealing strategy must stay shared |
| Upgradeability | `Long-Life` is service-upgradeable, not customer-openable |

## Prototype And Production Boundary

| Area | Prototype / Phase 1 | Production / Phase 2+ |
| --- | --- | --- |
| Main board | FS-HCore dev hardware | custom PCB around `ESP32-S3` |
| Turbidity path | analog | `SEN0600` RS485 |
| 4G module | SIM7670C on dev board | `A7670E` default |
| Enclosure | 3D-printed iteration | pilot-ready enclosure baseline |

## Required Deliverables

The firmware and hardware track should produce:

- firmware skeleton
- sensor read path
- MQTT publish path
- battery profile support
- enclosure CAD baseline
- bench evidence for runtime and reconnect
- field-test evidence

## Acceptance Criteria

- Device can read required Phase 1 sensors and produce a valid telemetry payload.
- Device can publish real payloads over MQTT via 4G.
- Runtime and low-battery logic use the correct battery profile.
- Enclosure and battery design remain compatible with shared core architecture.
- GPS and modem fallback rules match the decision register.

## Open Questions

- Whether the production PCB should reserve extra debug/test pads for pilot servicing.
- Whether analog turbidity should remain available as an optional fallback after RS485 migration.

## Related Docs

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
