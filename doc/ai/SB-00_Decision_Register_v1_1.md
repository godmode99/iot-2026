---
id: SB-00-DECISIONS
type: decision
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER]
source_of_truth: true
last_updated: 2026-04-06
language: English-first
audience: ai
---

# SB-00 Decision Register

## Purpose

This file records the decisions that materially change execution baseline, system behavior, procurement direction, or customer flow.

Use it to understand:

- what has been locked
- why it was chosen
- what downstream documents must follow

## Scope

This file covers closed baseline decisions for SB-00 v1.1.

It does not replace the master assumptions file. Instead, it explains how each locked baseline was chosen.

## Source Of Truth Rules

- This file is authoritative for decision status and rationale.
- Once a decision is closed, dependent docs must be updated to match.
- If a decision changes, update this file and the master file before editing dependent specs or tasks.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)

## Decision Index

| ID | Decision | Status | Owner | Closed on |
| --- | --- | --- | --- | --- |
| D-01 | Final enclosure external size | Closed | A | 2026-04-02 |
| D-02 | GPS fallback trigger (`L76K` -> `NEO-M8N`) | Closed | Pon + A | 2026-04-02 |
| D-03 | Provisioning baseline single flow | Closed | Pon | 2026-04-02 |
| D-04 | Production 4G sourcing fallback (`A7670E` / `SIM7670E`) | Closed | A | 2026-04-02 |
| D-05 | LINE OA paid-plan review trigger | Closed | Pon | 2026-04-02 |
| D-06 | Battery platform modular upgrade path | Closed | Pon + A | 2026-04-03 |
| D-07 | Auth and role model | Closed | Pon | 2026-04-06 |

## Core Content

### D-01 Final Enclosure External Size

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | A |
| Decision | Lock `150 x 100 x 60 mm` as the `Standard` baseline for `PCB v1` and pilot batch |
| Scope impact | PCB outline, 3D print cost, buoyancy, thermal layout, antenna placement, assembly |
| Rationale | Freezes early mechanical assumptions without blocking future optimization after pilot evidence exists |
| Constraint | `Long-Life` may expand the battery bay only, while preserving the shared core footprint under D-06 |
| Downstream docs | master assumptions, firmware/hardware spec, execution task list |

### D-02 GPS Fallback Trigger

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | Pon + A |
| Decision | Keep `L76K` as default and switch to `NEO-M8N` only when measured trigger conditions are hit |
| Trigger | median TTFF after wake > 60 seconds, or open-sky stationary error > 15 m for more than 10 percent of samples, or geofence false alert > 2 events per device per week |
| Scope impact | BOM, power budget, enclosure space, antenna placement, geofence reliability |
| Rationale | Preserves lower cost and lower power until field evidence justifies a heavier GPS module |
| Downstream docs | master assumptions, firmware/hardware spec, backend/security spec |

### D-03 Provisioning Baseline Single Flow

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | Pon |
| Decision | Use `QR + Web/PWA` as the only customer provisioning flow for MVP and pilot |
| Explicit exclusion | `BLE provisioning` is not part of the customer baseline in v1.1 |
| Internal-only tools | factory USB flash and QC/recovery tools |
| Scope impact | onboarding UX, browser support matrix, support load, manuals, QC, backend setup |
| Rationale | A single flow avoids customer confusion and keeps support, documentation, and implementation aligned across device types |
| Downstream docs | master assumptions, firmware/hardware spec, backend/security spec, execution task list |

### D-04 Production 4G Sourcing Fallback

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | A |
| Decision | Use `A7670E` as production default and allow `SIM7670E` only as a conditional sourcing fallback |
| Fallback condition | `A7670E` unavailable, or lead time > 14 days, or price delta > 20 percent, and bench validation must pass first |
| Required validation | power-up, MQTT over TLS, OTA flow |
| Scope impact | BOM freeze, PCB footprint, procurement risk, firmware compatibility confidence |
| Rationale | Keeps sourcing flexibility without allowing an undefined module swap late in the process |
| Downstream docs | master assumptions, procurement list, firmware/hardware spec |

### D-05 LINE OA Paid-Plan Review Trigger

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | Pon |
| Decision | Stay on `LINE free tier` through pilot, then review when forecast exceeds 200 messages per month or before commercial launch readiness review |
| Scope impact | monthly cost planning, notification strategy, pilot-user communication |
| Rationale | Avoids unnecessary recurring cost during pilot while still defining a concrete review trigger |
| Downstream docs | master assumptions, backend/security spec, pricing baseline |

### D-06 Battery Platform Modular Upgrade Path

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | Pon + A |
| Decision | Use one shared core module with two battery variants: `Standard` and `Long-Life` |
| Product strategy | `Standard` is the default baseline, `Long-Life` is a service-upgradeable option |
| Required constraints | shared battery connector standard, shared board mounting, firmware `battery_profile`, preserved sealing strategy, no customer-openable upgrade path |
| Scope impact | runtime target, BOM, enclosure size, waterproofing, serviceability, product packaging |
| Rationale | Enables a higher-runtime option without splitting firmware, backend, provisioning, or mainboard architecture into separate product lines |
| Downstream docs | master assumptions, firmware/hardware spec, procurement list, execution task list, battery platform spec |

### D-07 Auth and Role Model

| Field | Value |
| --- | --- |
| Status | Closed |
| Owner | Pon |
| Decision | Use a 4-type role model: `super_admin`, `reseller`, `customer`, and farm-level membership with granular permissions |
| User type strategy | Single Supabase Auth pool — all users share one login system, differentiated by `user_profiles.user_type` |
| Farm membership model | Farm owners can invite members to their farm with per-member permission flags: `can_view`, `can_receive_alerts`, `can_manage_alerts`, `can_send_commands` |
| Reseller model | Reseller is a distinct user type with a dedicated `reseller_farms` table mapping which farms they manage |
| Admin access | `super_admin` bypasses RLS entirely via service key — assigned manually by Pon through Supabase dashboard |
| Rollout plan | Pilot: `super_admin` + `customer` only — add `farm_members` in Phase 2, add `reseller` in Phase 3 |
| Scope impact | Schema migration required: add `user_profiles`, `farm_members`, `reseller_farms` tables — update all RLS policies |
| Rationale | Production-grade access control from the start avoids costly refactoring before commercial launch — gradual rollout keeps pilot timeline intact |
| Downstream docs | `SB-00_Auth_Role_Spec_v1_0.md`, `SB-00_UX_Flow_v1_0.md`, `SB-00_Backend_Security_v1_1.md`, `EX-06_SCHEMA_SPEC_v1_0.md` |

## Close Log

| ID | Closed on | Final choice summary |
| --- | --- | --- |
| D-01 | 2026-04-02 | Lock `150 x 100 x 60 mm` for `Standard` `PCB v1` and pilot batch |
| D-02 | 2026-04-02 | Keep `L76K` until measurable fallback trigger is hit |
| D-03 | 2026-04-02 | Customer provisioning uses `QR + Web/PWA` only |
| D-04 | 2026-04-02 | `A7670E` default with validated `SIM7670E` fallback |
| D-05 | 2026-04-02 | Use `LINE free tier` through pilot, then review |
| D-06 | 2026-04-03 | Shared core module plus `Standard` and `Long-Life` battery variants |
| D-07 | 2026-04-06 | 4-type role model: `super_admin`, `reseller`, `customer`, farm member with granular permissions |

## Acceptance Criteria

- Each baseline-changing decision has status, owner, rationale, and downstream impact.
- Closed decisions are ready to be consumed by task and spec documents.
- Provisioning and battery platform decisions are unambiguous.

## Open Questions

- Whether future decisions should move to one-file-per-decision once the system grows.
- Whether decision ownership should be normalized into a fixed team roster format.

## Related Docs

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
