---
id: SB-00-MASTER
type: master
status: active
owners: [Pon]
depends_on: []
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Master Assumptions

## Purpose

This file is the canonical baseline for SB-00 v1.1.

Use it to keep all planning, specification, execution, and costing documents aligned on:

- terminology
- scope boundaries
- budget baseline
- battery/runtime targets
- provisioning baseline
- compliance stance
- product variant assumptions

## Scope

This document covers the shared assumptions that other SB-00 documents must follow.

It does not replace:

- decision rationale in [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- execution sequencing in [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- implementation detail in system specs

## Source Of Truth Rules

- If another AI document conflicts with this file, treat this file as the baseline until an explicit update is made here.
- Closed decisions in the decision register must be reflected here.
- Reference-only documents may explain or estimate, but they cannot override this baseline.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)

## Document Sync Status

| Document | Version | Last synced | Status |
| --- | --- | --- | --- |
| `SB-00_Dev_Plan_Summary_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Business_Roadmap_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Decision_Register_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Backend_Security_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Firmware_Hardware_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Procurement_List_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Third_Party_Pricing_Baseline_v1_1.md` | 1.1 | 2026-04-03 | aligned |
| `SB-00_Execution_Task_List_v1_1.md` | 1.1 | 2026-04-03 | aligned |

## Terminology

| Term | Meaning |
| --- | --- |
| Engineering Field Test | Internal 7-day real-pond validation at the end of Phase 1 |
| Pilot / Beta Validation | 30-day validation with 3-5 pilot units before commercial sales |
| Commercial Launch | Paid public sales in Thailand after minimum regulatory readiness is met |
| Public Launch | Same meaning as Commercial Launch in SB-00 v1.1 |

## Budget Baseline

| Phase | Baseline budget |
| --- | --- |
| Phase 1 - Prototype and full test | ~20,400 THB |
| Phase 2 - PCB development | ~4,000 THB |
| Phase 3 - Pilot and launch readiness | ~4,300 THB |
| Total Phase 1-3 | ~28,700 THB |

Notes:

- This baseline excludes NBTC approval cost, IP67 lab testing, and marketing.

## Battery Baseline

| Item | Baseline |
| --- | --- |
| Default telemetry interval | 5 minutes |
| Minimum pass target | runtime >= 12 days |
| Stretch target after optimization | 14-16 days |
| Battery platform strategy | single core module plus two battery variants |
| Standard variant target | >= 12 days at 5-minute interval |
| Long-Life variant target | >= 30 days at 5-minute interval or >= 60 days at 10-minute interval |

Constraints:

- `Standard` is the default prototype and pilot baseline.
- `Long-Life` is an optional upgrade path, not a separate product architecture.
- Firmware, backend, dashboard, provisioning, and sensor stack must stay shared across both variants.
- Runtime calculations below the baseline are diagnostic references, not acceptance criteria.

## Field Validation Stages

| Stage | Duration | Use case |
| --- | --- | --- |
| Stage A - Engineering Field Test | 7 days | End of Phase 1 |
| Stage B - Pilot / Beta Validation | 30 days | Before commercial launch |

## Certification And Sales Stance

- Pilot and beta evaluation may happen before NBTC approval if the activity is non-commercial.
- Paid public sales in Thailand start only after required approval is complete.
- Phase 2 and Phase 3 documents should assume regulatory preparation begins before launch, not after it.

## OTA Authentication Baseline

| Route | Required auth |
| --- | --- |
| `/api/ota/releases` `POST` | `SVC` |
| `/api/ota/push` `POST` | `JWT (owner/admin)` |
| `/api/ota/push/batch` `POST` | `SVC` |

## Provisioning Baseline

| Area | Baseline |
| --- | --- |
| Customer provisioning flow | `QR Code + Web/PWA` only |
| MVP and pilot behavior | same single customer flow |
| BLE provisioning | not part of customer baseline in v1.1 |
| BLE status | internal R&D only until a new decision is closed |
| Native mobile app | not part of baseline |
| Factory USB / QC tool | internal-only factory, QC, recovery, or support tool |

Rules:

- All customer devices, including iPhone/iPad and Android devices, must use the same provisioning flow.
- Do not introduce a second customer-facing provisioning path without updating the decision register and this master file first.

## BOM Baseline

| Area | Prototype / Phase 1 | Production / Phase 2+ | Notes |
| --- | --- | --- | --- |
| MCU + 4G | FS-HCore-A7670C dev board | ESP32-S3 + `A7670E` custom PCB | `SIM7670E` is a conditional fallback only |
| GPS | `L76K` | `L76K` | `NEO-M8N` only when D-02 trigger is hit |
| Turbidity | analog sensor | `SEN0600 RS485` | analog path is dev/test only |
| Battery platform | `Standard` battery module | `Standard` + optional `Long-Life` | core module and provisioning remain shared |

## Third-Party Pricing Baseline

- The single planning reference for third-party pricing is [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md).
- Values for services such as `LINE OA`, `Vercel Pro`, `Upstash`, `HiveMQ`, `Supabase`, `Resend`, `Stripe`, and `Omise` are planning assumptions until re-verified before commercial launch.
- Free-tier and upgrade calculations should use the 5-minute telemetry baseline and the current active device count.

## Decision Status Summary

| ID | Status | Locked baseline | Owner | Closed on |
| --- | --- | --- | --- | --- |
| D-01 | Closed | `150 x 100 x 60 mm` external size for `Standard` PCB v1 and pilot batch | A | 2026-04-02 |
| D-02 | Closed | `L76K` stays default unless measurable fallback trigger is hit | Pon + A | 2026-04-02 |
| D-03 | Closed | `QR + Web/PWA` is the only customer provisioning flow | Pon | 2026-04-02 |
| D-04 | Closed | `A7670E` default with conditional `SIM7670E` fallback | A | 2026-04-02 |
| D-05 | Closed | `LINE free tier` through pilot, then review | Pon | 2026-04-02 |
| D-06 | Closed | single core module plus two battery variants | Pon + A | 2026-04-03 |

## Acceptance Criteria

- Other SB-00 AI docs can reference this file for the shared baseline without redefining it.
- Provisioning baseline is unambiguous.
- Battery platform baseline is unambiguous.
- Regulatory stance is unambiguous.
- Decision summary matches the decision register.

## Open Questions

- Whether to split this master file into versioned subdocuments after implementation starts.
- Whether to add front-matter linting to the doc build pipeline.

## Related Docs

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
