---
id: SB-00-PROCUREMENT
type: reference
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-TASKS]
source_of_truth: false
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Procurement Baseline

## Purpose

This file summarizes what must be purchased to execute SB-00 through prototype, pilot preparation, and launch readiness.

Use it for:

- purchase sequencing
- procurement risk review
- owner coordination
- matching parts to the current technical baseline

## Scope

This is a planning reference for procurement.

It does not override:

- master assumptions
- closed technical decisions
- final production BOM

## Source Of Truth Rules

- Use this file as a planning reference only.
- If hardware baseline changes, update the master and decision files first.
- Pricing for software/services should defer to the pricing baseline file.

## Dependencies

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md)

## Budget Summary

| Phase | Budget estimate | Notes |
| --- | --- | --- |
| Phase 1 - Prototype and full test | ~20,400 THB | tools, dev hardware, sensors, materials |
| Phase 2 - PCB development | ~4,000 THB | PCB revisions and component set |
| Phase 3 - Pilot and launch readiness | ~4,300 THB | pilot batch, printed enclosures, misc |
| Total Phase 1-3 | ~28,700 THB | excludes NBTC, IP67 lab, and marketing |

## Procurement Groups

### One-Time Tools And Workshop Items

Typical examples:

- multimeter
- logic analyzer
- soldering tools for A
- breadboard and jumper kits
- sealing and assembly tools
- 3D printing access or printed enclosure path

These items support prototype and pilot development, but are not per-unit COGS.

### Phase 1 Device Bring-Up Items

Core items:

- `FS-HCore-A7670C` dev board
- SIM cards for operator testing
- `L76K`
- `DS18B20`
- analog turbidity sensor
- `MAX17048`
- `MT3608`
- level shifting and support modules
- battery and charging prototype path

Purpose:

- unlock firmware, sensor, and telemetry bring-up before custom PCB work

### Prototype Materials And Mechanical Items

Core items:

- enclosure print material or print service
- cable glands
- seals and sealing materials
- connectors
- antenna and pigtails
- mounting hardware

Purpose:

- unlock waterproof assembly and field-test preparation

### Production-Oriented Component Baseline

Core items:

- `ESP32-S3`
- `A7670E` as production default
- `SIM7670E` only as fallback under D-04
- `L76K` as default GPS
- `NEO-M8N` only under D-02 trigger
- `SEN0600 RS485` for production turbidity path
- custom PCB materials
- standard enclosure path

## Battery Variant Procurement

### Standard Variant

Baseline parts:

- `18650 x2` class battery path
- holder or pack support
- charger/protection path
- standard enclosure battery volume

### Long-Life Variant

Additional planning items:

- extra battery cells or larger battery module
- battery-module hardware
- higher-capacity battery bay or enclosure section
- service-safe connector and protection choices

Rule:

- `Long-Life` must remain an upgradeable variant on the same core platform, not a separate product architecture.

## Purchase Sequencing

### First Purchases

Buy first:

1. prototype dev board and sensors
2. core debug tools
3. battery prototype path
4. basic enclosure and sealing materials

### Second Wave

Buy second:

1. pilot-oriented enclosure parts
2. production-path sensors such as `SEN0600`
3. fallback components only if triggered by field or sourcing evidence

### Later Or Conditional

Buy later:

- `SIM7670E` only if fallback condition is triggered
- `NEO-M8N` only if fallback trigger is triggered
- `Long-Life` module parts only after battery platform interface is closed enough for procurement confidence

## Ownership Notes

| Area | Primary owner |
| --- | --- |
| firmware/dev bring-up parts | Pon |
| hardware/mechanical/build parts | A |
| shared or blocking purchases | Pon + A |

## Procurement Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| modem availability changes | can block PCB/BOM freeze | use D-04 fallback rule |
| GPS underperforms in field | can force module change | use D-02 measured trigger |
| enclosure assumptions drift | can waste mechanical purchases | keep D-01 and D-06 aligned before locking parts |
| long-life battery scope grows | can inflate cost and dimensions | keep `Long-Life` behind the shared battery interface spec |

## Acceptance Criteria

- Phase 1 purchase list supports `EX-01` through `EX-08A`.
- Conditional purchases match closed decision triggers.
- Battery procurement supports both `Standard` and optional `Long-Life` planning without splitting architecture.

## Open Questions

- Whether pilot batch should include one or more `Long-Life` units from the first build.
- Whether any one-time tools should be outsourced instead of purchased.

## Related Docs

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
