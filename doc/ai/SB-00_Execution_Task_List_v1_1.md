---
id: SB-00-TASKS
type: task
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS]
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Execution Task List

## Purpose

This file converts the locked SB-00 baseline into a ready-to-execute task list through pilot start.

Use it to answer:

- what should be built next
- who owns each task
- what each task depends on
- what counts as done

## Scope

This task list covers work from environment setup through pilot launch readiness.

It does not contain detailed implementation specs; those belong in system-specific documents.

## Source Of Truth Rules

- This file is authoritative for execution sequencing and task ownership at the SB-00 planning level.
- Tasks must follow the current master assumptions and closed decisions.
- If a task conflicts with a closed decision, update the decision and master baseline first.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)

## Working Goal

The execution path should produce a pilot-ready system that can:

- measure temperature, turbidity, GPS, and battery data on a real device
- send telemetry through `MQTT over 4G/TLS`
- persist data to backend and database
- display device status on a dashboard
- pass internal field and pilot readiness gates

## Locked Baseline For Execution

| Area | Locked baseline |
| --- | --- |
| Enclosure | `150 x 100 x 60 mm` for `Standard` PCB v1 and pilot batch |
| GPS | `L76K` default with measured fallback trigger to `NEO-M8N` |
| Provisioning | `QR + Web/PWA` only for customers in MVP and pilot |
| Battery platform | `Standard` baseline plus optional `Long-Life` upgrade on shared core module |
| Production 4G | `A7670E` default with conditional `SIM7670E` fallback |
| Battery acceptance target | `>= 12 days @ 5-minute interval` |
| Pilot messaging | `LINE free tier` during pilot |

## Critical Path

1. Procurement and dev environment are usable.
2. Firmware, backend ingest, and dashboard MVP are connected end to end.
3. Bench test, runtime, and connectivity stability are validated.
4. Engineering Field Test passes with evidence.
5. PCB v1, enclosure v1, and secure provisioning/OTA are ready.
6. Pilot units, QC, and onboarding flow are ready.
7. Pilot / Beta Validation starts.

## Core Content

### P0 Immediate Queue

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-01 | Pon | Set up `firmware`, `backend`, and `dashboard` workspace on one dev machine with `.env` inventory and secret checklist | baseline docs locked | one-page runbook exists, env names match backend docs, dev stack boots successfully |
| EX-02 | Pon + A | Order missing Phase 1 parts from the procurement baseline | baseline BOM locked | purchase list exists, orders placed, ETA tracked per item |
| EX-03 | Pon | Build ESP32-S3 firmware skeleton with config load, NVS, scheduler, watchdog, and structured logging | EX-01 | build passes, boot works, boot summary log exists, config save/read works |
| EX-04 | Pon | Implement Phase 1 sensor drivers for `DS18B20`, analog turbidity, `MAX17048`, and `L76K` on dev hardware | EX-03 | continuous reads work, sample payload exists, sensor fault handling exists |
| EX-05 | Pon | Implement 4G plus MQTT over TLS on FS-HCore and publish real telemetry payloads | EX-03 | QoS1 publish works, reconnect works, offline buffer/retry starts working |
| EX-06 | Pon | Create Supabase schema, migrations, and RLS for farms, devices, telemetry, alerts, and command log | EX-01 | migrations run, core tables exist, main RLS policy works |
| EX-07 | Pon | Build ingest path from MQTT to backend to DB and store latest device status | EX-05, EX-06 | real telemetry lands in DB and latest status query works |
| EX-08 | A | Lock enclosure CAD v1 for `150 x 100 x 60 mm` baseline including antenna, cable gland, battery, and mounting positions | D-01 closed | CAD/STL draft exists and placement fit check passes |
| EX-08A | Pon + A | Define battery platform interfaces for `Standard` and `Long-Life` including connector, profile, service procedure, and enclosure interface | EX-01 | one shared interface spec exists for both variants |

### EX-08A Deliverables

| Deliverable | Owner | Definition |
| --- | --- | --- |
| Interface spec | Pon + A | one-page shared interface between firmware, backend, battery module, and enclosure |
| Battery profile table | Pon | one-page profile table for `standard` and `long_life` variants |
| BOM delta | Pon + A | one-page difference summary between `Standard` and `Long-Life` |

### EX-08A Working Checklist

1. Define firmware `battery_profile` values for at least `standard` and `long_life`.
2. Define backend and device metadata fields for battery variant and usable capacity.
3. Summarize charging and runtime assumptions for both variants in one table.
4. Lock one battery connector standard for both variants and prevent reverse insertion.
5. Keep shared positions for core board mount, antenna bulkhead, and sensor exits.
6. Restrict enclosure changes to battery bay or rear housing without breaking main sealing strategy.
7. Treat `Long-Life` as service-upgradeable, not customer-openable.
8. Produce a one-page BOM delta for pilot decision support.
9. Sign-off: Pon approves firmware/backend fields, A approves connector and enclosure interface.

### Phase 1 Completion - Prototype To Stage A Field Test

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-09 | Pon | Build dashboard MVP with device list, latest-card view, map, historical chart, and online/offline state | EX-07 | dashboard correctly shows 1-3 devices with latest values and map |
| EX-10 | Pon | Build alert MVP for threshold, offline, and low-battery alerts with LINE/email/web stubs | EX-07 | all three alert types trigger and resolve, duplicate suppression works |
| EX-11 | Pon | Build customer provisioning flow using `QR + Web/PWA` | EX-06, EX-07 | QR scan leads to successful device registration and farm binding |
| EX-12 | Pon + A | Run 48-hour bench soak test for sensor reads, MQTT reconnect, buffer flush, and power-cycle recovery | EX-04, EX-05, EX-07 | no data corruption, reconnect works, crash/reboot rate is acceptable |
| EX-13 | Pon + A | Measure real current draw and estimate runtime against `>= 12 days @ 5-minute interval` baseline | EX-12 | measurement sheet exists, runtime estimate uses measured values, gap list exists |
| EX-14 | A | Assemble first enclosure prototype and waterproof assembly flow | EX-08 | real prototype can be assembled and antenna/cable gland layout works |
| EX-15 | Pon + A | Run 7-day Engineering Field Test and summarize runtime, connectivity, GPS trigger, and sensor stability findings | EX-09, EX-10, EX-11, EX-13, EX-14 | one field-test report exists with pass/fail conclusion against baseline |

### Phase 2 - Pilot Preparation

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-16 | A | Build PCB v1 schematic using locked BOM: `ESP32-S3 + A7670E + L76K + MAX17048 + SEN0600 path + power switching` | EX-15 | schematic review passes and critical nets are correct |
| EX-17 | A | Build PCB layout v1 to fit the `Standard` enclosure baseline and prepare Gerber, BOM, and CPL | EX-16, EX-08 | DRC passes, manufacturing package is complete, fit check passes |
| EX-17A | A | Design enclosure interface for two battery module sizes without changing core board mount or main sealing strategy | EX-08, EX-08A | CAD concept exists for both `Standard` and `Long-Life` with service access plan |
| EX-18 | Pon + A | Bench-validate `SIM7670E` fallback path against `A7670E` baseline | EX-16 | compatibility note clearly states whether fallback is acceptable |
| EX-19 | Pon | Build secure production provisioning and OTA flow with signed firmware, release metadata, push auth, and recovery path | EX-07, EX-11 | OTA tests pass on dev hardware and rollback path is documented |
| EX-20 | Pon | Evaluate `BLE provisioning` only as post-pilot internal R&D without affecting customer flow | EX-11 | one internal technical note recommends continue/stop without changing customer docs |
| EX-21 | A | Create assembly and QC package for pilot batch including visual, electrical, waterproof, and provisioning checks | EX-17, EX-19 | QC checklist is usable on the floor and serial/QR workflow is clear |
| EX-22 | Pon | Harden backend for pilot with monitoring, logging, backups, retry jobs, and export/report path | EX-09, EX-10, EX-19 | pilot ops checklist passes and logs/backup/retry path work |
| EX-23 | Pon + A | Assemble first pilot units and validate onboarding end to end | EX-21, EX-22 | 3-5 devices onboard successfully, pass QC, and appear correctly in dashboard/alerts |

### Pilot Start Readiness

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-24 | Pon | Finalize pilot user guide, install guide, QR onboarding guide, troubleshooting guide, and support path | EX-23 | shareable PDF/Word guide exists |
| EX-25 | Pon + A | Run final Pilot Readiness Review before the 30-day pilot | EX-23, EX-24 | sign-off exists for battery, GPS, enclosure, provisioning, and backend ops |
| EX-26 | Pon + A | Start 30-day Pilot / Beta Validation with issue log and weekly review cadence | EX-25 | pilot start date is locked, issue log template exists, owners are assigned |

### Not Critical For Pilot Start

| ID | Owner | Task | Why not critical now | Review point |
| --- | --- | --- | --- | --- |
| EX-27 | Pon | LINE paid-plan cost optimization | free tier is acceptable during pilot | review before commercial launch |
| EX-28 | Pon | production billing polish for Stripe/Omise | pilot can remain non-commercial or limited evaluation | review during launch readiness |
| EX-29 | A | enclosure size optimization after pilot | current baseline is acceptable for PCB v1 and pilot | review after buoyancy, thermal, and assembly evidence exists |

## Suggested Working Rhythm

| Cadence | Focus |
| --- | --- |
| Daily | update task status, blocker, and next action per owner |
| Every 3 days | sync firmware, backend, and hardware assumptions against the master baseline |
| Weekly | review bench and field evidence against acceptance criteria |
| End of each stage | confirm which tasks actually passed definition of done |

## First 10 Tasks To Start Immediately

1. `EX-01` workspace and environment inventory
2. `EX-02` missing Phase 1 procurement
3. `EX-03` firmware skeleton
4. `EX-06` schema and migrations
5. `EX-04` sensor drivers
6. `EX-05` 4G and MQTT/TLS
7. `EX-07` ingest path
8. `EX-08A` battery platform interface
9. `EX-08` enclosure CAD v1
10. `EX-09` dashboard MVP

## Acceptance Criteria

- Immediate queue is executable without reinterpreting the baseline.
- Every listed task has owner, dependency, and definition of done.
- Provisioning and battery-platform tasks reflect closed decisions.

## Open Questions

- Whether to add per-task status fields in front matter or keep status in a separate tracker.
- Whether Phase 2 tasks should move into a dedicated pilot-prep file later.

## Related Docs

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
