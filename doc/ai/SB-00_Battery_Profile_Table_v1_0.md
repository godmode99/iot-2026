---
id: SB-00-BATTERY-PROFILES
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-BATTERY-INTERFACE, SB-00-MASTER, SB-00-FW-HW]
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Battery Profile Table

## Purpose

This file defines the canonical `battery_profile` values used by:

- firmware
- backend
- dashboard
- support and ops references

## Scope

This spec covers only profile values and derived rules for the approved battery variants.

It does not define mechanical design or BOM structure.

## Source Of Truth Rules

- Use this file for battery profile values.
- Do not hardcode battery thresholds outside this profile set.
- If a profile changes, update this file first and then sync dependent logic.

## Dependencies

- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)

## Canonical Profiles

| Field | `standard` | `long_life` | Notes |
| --- | --- | --- | --- |
| `battery_variant` | `standard` | `long_life` | canonical enum |
| `battery_profile_version` | `v1` | `v1` | same profile version at initial rollout |
| `usable_capacity_mah` | `5600` | `23200` | used for runtime estimation |
| `default_interval_sec` | `300` | `300` | both start at 5-minute interval |
| `night_interval_sec` | `900` | `1800` | `Long-Life` allows a more aggressive night-saving profile |
| `low_battery_warn_pct` | `15` | `20` | `Long-Life` warns earlier because service cost is higher |
| `low_battery_critical_pct` | `10` | `10` | shared critical threshold |
| `service_only_upgrade` | `true` | `true` | battery replacement is service-managed |

## Derived Runtime Targets

| Variant | Interval | Runtime target | Use case |
| --- | --- | --- | --- |
| `standard` | 5 minutes | `>= 12 days` | default prototype and pilot baseline |
| `standard` | 10 minutes | stretch only | optional battery-saving mode |
| `long_life` | 5 minutes | `>= 30 days` | higher-runtime near-real-time use |
| `long_life` | 10 minutes | `>= 60 days` | long-runtime use case |

## Firmware Rules

1. map `battery_variant` directly to this profile table
2. do not hardcode thresholds outside the active profile
3. runtime estimator must use `usable_capacity_mah`
4. persist `battery_profile_version` in device metadata whenever the profile changes

## Backend And Dashboard Rules

Backend device metadata must store:

- `battery_variant`
- `battery_profile_version`
- `usable_capacity_mah`

Dashboard behavior must:

- display the active battery variant
- compute runtime estimate using the active profile
- align battery warnings with the active thresholds

## Change Management

This `v1` table is the implementation baseline.

If measured current draw, field evidence, or degradation assumptions change materially:

1. bump the profile version
2. update this file
3. sync dependent firmware and backend logic

## Acceptance Criteria

- Both approved battery variants have one canonical profile each.
- Runtime estimator inputs are explicit.
- Warning and critical thresholds are explicit.

## Open Questions

- Whether future profile versions should include seasonal or region-specific runtime presets.
- Whether `night_interval_sec` should become optional per farm in a later version.

## Related Docs

- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
