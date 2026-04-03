---
id: SB-00-BATTERY-INTERFACE
type: spec
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-TASKS]
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Battery Platform Interface Spec

## Purpose

This file defines the shared interface for `EX-08A`.

It exists to keep firmware, backend, battery module, and enclosure work aligned across two battery variants:

- `Standard`
- `Long-Life`

## Scope

This spec covers only the interface contract between shared core architecture and battery-specific parts.

It does not replace:

- detailed hardware CAD
- detailed BOM costing
- detailed firmware implementation

## Source Of Truth Rules

- Use this file for the battery-platform interface contract.
- Use the decision register for why the two-variant strategy was chosen.
- Use the task list for delivery sequence and sign-off flow.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)

## Variant Definition

| Variant | Role | Runtime target |
| --- | --- | --- |
| `Standard` | default prototype and pilot baseline | `>= 12 days @ 5-minute interval` |
| `Long-Life` | optional service-upgradeable runtime variant | `>= 30 days @ 5-minute interval` or `>= 60 days @ 10-minute interval` |

## Shared Interface Rules

The following must remain shared across both variants:

- core board mounting points
- battery connector family and orientation
- antenna bulkhead positions
- sensor cable exit positions
- QR label and customer provisioning flow
- shared firmware codebase
- shared backend schema
- shared dashboard logic framework

## Variant-Specific Parts

The following may change by variant:

- battery capacity
- battery tray or service frame
- battery bay depth or rear housing section
- usable battery capacity value
- service instructions

## Firmware Interface

Firmware must support these fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `battery_variant` | enum | identifies `standard` or `long_life` |
| `battery_profile_version` | string | identifies active profile revision |
| `usable_capacity_mah` | integer | used for runtime estimation |
| `service_only_upgrade` | boolean | indicates service-only battery swap policy |

Firmware must:

1. read `battery_variant`
2. map it to a `battery_profile`
3. use profile values for runtime estimator
4. use profile thresholds for warnings and alerts

## Backend And Dashboard Interface

Backend device metadata must store:

- `battery_variant`
- `battery_profile_version`
- `usable_capacity_mah`

Dashboard must display:

- battery variant
- battery percentage
- current reporting interval
- estimated runtime remaining

## Hardware And Enclosure Interface

Hardware constraints:

1. both variants must use the same battery connector family
2. reverse insertion must be prevented
3. core board mount must remain unchanged
4. `Long-Life` may change battery zone, battery bay, or rear housing section only
5. main sealing strategy must remain shared
6. `Long-Life` must be service-upgradeable, not customer-openable

## EX-08A Deliverables

`EX-08A` is complete only when these outputs exist:

1. one-page interface spec
2. one-page battery profile table
3. one-page BOM delta between `Standard` and `Long-Life`

## Sign-Off

| Area | Owner |
| --- | --- |
| firmware fields, backend fields, runtime assumptions | Pon |
| connector choice, enclosure interface, service procedure | A |

## Acceptance Criteria

- Both battery variants fit the same shared core architecture.
- Firmware and backend can identify the active battery variant.
- Mechanical changes for `Long-Life` are limited to battery-specific sections.
- Customer flow remains identical across variants.

## Open Questions

- Whether the final connector choice should live here or in a downstream hardware appendix.
- Whether `Long-Life` should have one capacity profile or multiple approved sub-variants.

## Related Docs

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
- [SB-00_BOM_Delta_Standard_vs_LongLife_v1_0.md](./SB-00_BOM_Delta_Standard_vs_LongLife_v1_0.md)
