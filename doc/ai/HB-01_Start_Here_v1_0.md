# ArayaShiki Lab — Start Here

**Version 1.1 | April 2026 | Human-friendly entry point | Last synced: 2026-04-09**

---

## What This Repository Is

This repository now sits inside the broader `ArayaShiki Lab` company story.

At the company level, ArayaShiki Lab is building a `smart hatchery and aquaculture ecosystem` that connects:

- records entered by people
- data from boards and sensors
- monitoring and alerts
- future automation and process orchestration

Within that broader direction, the current repository still contains the `SB-00` pilot path and related dashboard, backend, firmware, and operations work.

## What You Should Understand First

There are now two reading layers:

1. `company layer`
2. `product / implementation layer`

If you need company framing first, read:

1. `ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md`
2. `HB-05_Business_And_Launch_v1_0.md`

If you need implementation detail first, continue into the `SB-00_*` documents.

## What SB-00 Still Means

`SB-00` remains the active pilot-ready IoT monitoring path in this repository.

It still covers:

- field telemetry
- backend and dashboard visibility
- pilot onboarding through `QR + Web/PWA`
- the current hardware and battery strategy

What changed is the framing:

- `SB-00` is no longer the whole company story
- it is one important path inside the broader ecosystem

## What Is Already Locked

| Area | Locked baseline |
| --- | --- |
| Provisioning | `QR + Web/PWA` flow only |
| GPS | `L76K` as default |
| 4G production | `A7670E` as default |
| Battery platform | one shared core module with `2 battery variants` |
| Variants | `Standard` and `Long-Life` |
| Standard target | `>= 12 days @ 5-minute interval` |
| Long-Life direction | `>= 30 days @ 5-minute interval` or `>= 60 days @ 10-minute interval` |

## Team Split

| Person | Focus |
| --- | --- |
| `Pon` | firmware, backend, dashboard, MQTT, OTA, battery profile |
| `A` | enclosure, hardware, battery module, waterproofing, assembly |

## What We Are Doing Next

Current priorities are still implementation-driven:

1. set up and stabilize the workspace
2. lock the battery platform interface
3. push the `SB-00` path forward as the current monitoring baseline

## The 5 Documents You Actually Need

1. this file
2. `ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md`
3. `HB-05_Business_And_Launch_v1_0.md`
4. `SB-00_Master_Assumptions_v1_1.md`
5. `SB-00_Execution_Task_List_v1_1.md`

## Non-Negotiables

1. do not collapse the company story back into a single-product-only story
2. customer provisioning still uses one `QR + Web/PWA` flow
3. do not split firmware by battery variant
4. `Long-Life` remains service-upgradeable, not customer-openable
5. `Standard` remains the main pilot baseline
