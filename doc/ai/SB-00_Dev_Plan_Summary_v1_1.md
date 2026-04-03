---
id: SB-00-DEV-PLAN
type: reference
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-TASKS]
source_of_truth: false
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Development Plan Summary

## Purpose

This file summarizes the development rhythm, ownership split, and milestone timeline for SB-00.

Use it for:

- fast project orientation
- owner alignment
- milestone planning
- dependency awareness

## Scope

This is a planning summary, not a detailed task list.

It should stay aligned with the execution task list and business roadmap, but it does not override either of them.

## Source Of Truth Rules

- Use the execution task list for exact task-level sequencing.
- Use this file for high-level timeline and team split only.
- If timeline and task list disagree, the task list wins.

## Dependencies

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Business_Roadmap_v1_1.md](./SB-00_Business_Roadmap_v1_1.md)

## Team Split

| Person | Primary responsibility | Working baseline |
| --- | --- | --- |
| Pon | firmware, backend, dashboard, MQTT, OTA | can work from dev hardware and software stack without soldering |
| A | PCB, enclosure, assembly, waterproofing, physical integration | owns soldering, hardware assembly, and mechanical execution |

## Parallel Development Model

### Pon Track

Pon can move ahead on:

- firmware logic
- sensor drivers on dev setup
- backend schema and ingest
- dashboard MVP
- provisioning flow

### A Track

A can move ahead on:

- FS-HCore hardware bring-up
- enclosure iterations
- waterproof assembly
- PCB design
- physical validation

### Shared Sync Points

Both sides must sync on:

- pin assignment
- enclosure and cable exits
- runtime and power evidence
- field test results
- PCB bug list

## Milestone Timeline

| Phase | Time window | Goal |
| --- | --- | --- |
| Phase 1 | Apr-Jun 2026 | all core functions work and engineering field test passes |
| Phase 2 | Jun-Aug 2026 | PCB pilot hardware and regulatory-prep path are ready |
| Phase 3 | Sep-Oct 2026 | pilot runs and launch readiness gaps are closed |

## Phase Summary

### Phase 1

Target outcomes:

- first successful sensor reads
- MQTT to cloud path works
- dashboard is live
- enclosure v1 exists
- waterproof and runtime evidence exists
- 7-day Engineering Field Test completes

### Phase 2

Target outcomes:

- PCB iterations complete
- pilot-ready assembly path exists
- shared battery-platform decisions are reflected in hardware
- regulatory preparation is underway

### Phase 3

Target outcomes:

- pilot or beta validation runs
- onboarding, payment, and landing flow are coherent
- launch readiness checklist is closeable

## Dependency Notes

| Item | Typical blocker | Unblock path |
| --- | --- | --- |
| firmware on final PCB | hardware pin map not fixed | send pin map before PCB order |
| hardware MQTT validation | modem/SIM path not ready | prepare SIM and FS-HCore early |
| pilot assembly | firmware binary and QC flow not ready | align binary, flash guide, and checklist before build |
| dashboard go-live | payment and onboarding flow not ready | complete end-to-end staging test first |

## Critical Path Summary

`sensor read -> MQTT cloud -> dashboard -> engineering field test -> PCB -> pilot units -> pilot validation -> commercial readiness`

## Definition Of Done Summary

### Phase 1

- core sensor path works
- MQTT over 4G/TLS works
- dashboard and map work
- battery baseline meets minimum target
- OTA path works
- LINE alert path works
- waterproof self-test passes
- critical bugs are cleared before Phase 2

### Phase 2

- pilot PCB behaves like the prototype baseline
- enclosure and sealing remain viable
- pilot units can be assembled repeatably
- regulatory preparation has started

### Phase 3

- real pilot farms are active
- support and onboarding are usable
- launch blockers are visible and trackable
- commercial launch remains gated by required approvals

## Working Rhythm

| Cadence | Purpose |
| --- | --- |
| weekly sync | progress, blockers, next-step alignment |
| ad-hoc technical sync | decision points that affect both tracks |
| milestone review | confirm that phase-level done criteria are actually met |

## Acceptance Criteria

- Team ownership is clear.
- High-level timeline matches current execution direction.
- Shared blocker points are visible.

## Open Questions

- Whether the current timeline should be re-baselined once implementation starts.
- Whether a separate issue tracker should mirror phase-level done criteria explicitly.

## Related Docs

- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Business_Roadmap_v1_1.md](./SB-00_Business_Roadmap_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
