---
id: EX-05-CONNECTIVITY-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-03-FIRMWARE-SKELETON-SPEC, EX-04-SENSOR-DRIVERS-SPEC, SB-00-FW-HW]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-05 4G And MQTT TLS Spec v1.0

## Purpose

This file defines the first real connectivity implementation on development hardware.

Use it to answer:

- what the modem and MQTT flow must do
- what reliability behavior must exist in the first pass
- what output must be visible before ingest work begins

## Scope

`EX-05` covers:

- modem initialization
- network attach
- time sync baseline
- MQTT over TLS
- QoS1 publish
- reconnect handling
- offline buffer and later flush baseline

It does not cover:

- production fallback modem validation
- OTA implementation
- full command downlink handling

## Source Of Truth Rules

- This file is authoritative for `EX-05`.
- Use the firmware and hardware spec for transport, modem, and reconnect baseline.
- Do not downgrade to a simpler transport such as HTTP polling for the prototype path.

## Dependencies

- [EX-03_FIRMWARE_SKELETON_SPEC_v1_0.md](./EX-03_FIRMWARE_SKELETON_SPEC_v1_0.md)
- [EX-04_SENSOR_DRIVERS_SPEC_v1_0.md](./EX-04_SENSOR_DRIVERS_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)

## Objective

Publish real telemetry from development hardware over `4G + MQTT + TLS` so the backend ingest path can be built against live-like data.

The output must be good enough to unlock:

- `EX-07`
- `EX-12`

## Required Connectivity Flow

The first-pass firmware connectivity flow should be:

`boot -> modem init -> network attach -> time sync -> MQTT connect -> publish QoS1 -> disconnect or sleep according to runtime policy`

## Required Capabilities

### Modem

- initialize the development modem path
- attach to network
- expose attach failure logs
- surface basic signal or registration status when available

### Time Sync

- synchronize time once network is available
- avoid publishing obviously invalid timestamps where practical

### MQTT

- use TLS
- publish with `QoS1`
- support reconnect after drop or reboot
- keep topic naming explicit and centralized

### Offline Buffer

- if publish fails, store payload locally
- flush stored payloads after reconnect
- preserve original recorded time where possible

## Required Publish Payload

The first publish path must include at least:

- `device_id`
- `timestamp`
- `temperature_c`
- `turbidity_raw`
- `battery_percent`
- `battery_mv`
- `lat`
- `lng`

Optional first-pass fields may include:

- `firmware_version`
- `signal_quality`
- `gps_fix_state`
- `battery_variant`

## Topic Baseline

The first implementation must define one explicit topic baseline for:

- telemetry uplink
- device status uplink if separate
- future command placeholder

The names can be provisional but must be documented in code or runbook.

## Failure Handling Baseline

The first version must handle:

- modem init failure
- no network attach
- TLS or broker connection failure
- publish timeout or broker rejection
- reconnect after temporary loss

Failure behavior should:

- log the reason clearly
- preserve unsent payloads when possible
- avoid corrupting queued data

## Required Debug Evidence

`EX-05` should leave behind evidence such as:

- one successful publish log
- one reconnect or retry log
- one buffered payload example if publish is interrupted
- topic naming note

## Recommended Internal Modules

| Module | Responsibility |
| --- | --- |
| `modem` | modem init, attach, registration status |
| `time_sync` | clock sync after network attach |
| `mqtt` | broker connect, publish, reconnect |
| `buffer` | local storage for unsent payloads |
| `publish_service` | orchestration of read sample to publish attempt |

## Non-Goals

- command downlink semantics
- OTA artifact fetch
- final production SIM failover logic
- long soak stability proof

## Definition Of Done

`EX-05` is done when all of the following are true:

1. firmware can attach to network on development hardware
2. firmware can establish MQTT over TLS
3. firmware can publish at least one real telemetry payload with QoS1
4. reconnect behavior exists for transient failure
5. unsent payload buffering exists in starter form
6. topic naming is explicit enough for backend ingest work

## Acceptance Criteria

- Real telemetry reaches the MQTT transport path.
- Reliability behavior is present at minimum viable level.
- Downstream ingest can consume payloads without redefining transport assumptions.

## Open Questions

- Whether MQTT status should be a separate topic from telemetry in the first version.
- Whether the first buffer implementation should use RAM-only or persisted storage immediately.

## Related Docs

- [EX-04_SENSOR_DRIVERS_SPEC_v1_0.md](./EX-04_SENSOR_DRIVERS_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
