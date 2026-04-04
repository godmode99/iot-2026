---
id: AI-START-HERE
type: standard
status: active
owners: [Pon]
depends_on: [AI-DOC-STANDARD, SB-00-MASTER, SB-00-DECISIONS, SB-00-TASKS]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# AI Start Here

## Purpose

This file is the first entrypoint for Codex and other implementation agents.

Use it to answer:

- what this repository is trying to build
- which documents are authoritative
- what should be implemented first
- which assumptions are locked and must not be reinterpreted

## Scope

This file covers:

- source-of-truth navigation
- immediate execution priorities
- locked delivery boundaries for the next implementation phase

It does not replace detailed specs or task-level documents.

## Source Of Truth Rules

- Start here first.
- Then read `master`, `decision`, and `task` documents before changing code or structure.
- `reference` files can provide context but cannot override `master`, `decision`, or `spec`.
- If implementation needs a new assumption, update the relevant AI document before or alongside code changes.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)

## Project Summary

This repository plans a pilot-ready IoT buoy system that can:

- read temperature, turbidity, GPS, and battery data
- send telemetry over `MQTT + 4G + TLS`
- persist device and telemetry state in backend plus database
- expose current and historical device state on a dashboard
- support pilot onboarding through `QR + Web/PWA`

## Locked Baseline Snapshot

| Area | Locked baseline |
| --- | --- |
| Customer provisioning | `QR + Web/PWA` only in MVP and pilot |
| Battery platform | shared core module with `Standard` and `Long-Life` battery variants |
| Long-Life servicing | service-upgradeable, not customer-openable |
| Standard enclosure baseline | `150 x 100 x 60 mm` |
| Firmware platform | `ESP-IDF v5.x` on `ESP32-S3` |
| Backend data platform | `Supabase` |
| Telemetry transport | `MQTT over 4G/TLS` |
| Immediate software scope | `EX-01`, `EX-03`, `EX-04`, `EX-05`, `EX-06`, `EX-07`, `EX-09`, `EX-11` |

## Current Repository State

At the time of writing:

- the repository is documentation-heavy
- implementation workspaces such as `firmware/`, `backend/`, and `dashboard/` are not yet present
- the next critical task is `EX-01`

## Reading Order For AI Agents

1. [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
2. [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
3. [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
4. [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
5. [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)
6. [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
7. relevant specs such as backend, firmware, battery, procurement, or roadmap docs

## Source Map

| Need | Primary file | Notes |
| --- | --- | --- |
| shared baseline | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) | use when deciding what is in or out of scope |
| locked decisions | [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md) | use before changing customer flow, battery strategy, or enclosure assumptions |
| execution order | [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md) | use for owner, dependency, and done criteria |
| implementation workflow | [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md) | use for day-to-day execution order |
| bootstrap detail | [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md) | use when scaffolding the first code workspaces |
| firmware and hardware detail | [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md) | use for ESP-IDF, peripherals, power, and hardware assumptions |
| backend and security detail | [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md) | use for schema, RLS, backend, auth, and ops baseline |
| battery interface detail | [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md) | use when implementing battery metadata and variant support |

## Immediate Working Priorities

1. Execute `EX-01` to create the initial code workspace and environment inventory.
2. Use the result of `EX-01` to unlock `EX-03`, `EX-06`, and `EX-09`.
3. Keep implementation aligned with locked provisioning and battery-platform decisions.
4. Avoid building optional or post-pilot work before the end-to-end prototype path is functional.

## Rules For Implementation Agents

- Do not invent an alternate provisioning path.
- Do not assume BLE is part of customer flow.
- Do not assume only one battery variant exists.
- Prefer explicit environment variables and file paths over implicit defaults.
- Prefer working skeletons that build or boot over empty placeholder folders.
- When possible, leave a runbook, example config, and acceptance notes together with code changes.

## Definition Of Ready For Code Work

Code implementation can start when all of the following are true:

- the agent has read the current baseline and decisions
- the next task in the execution list is clear
- required local tooling is available or gaps are documented
- the task has a concrete acceptance target

## Acceptance Criteria

- An implementation agent can read this file and find the correct follow-up docs without guessing.
- Immediate priorities are explicit.
- Locked customer and battery assumptions are visible at the entrypoint.
- This file points clearly to the bootstrap playbook and task-level spec.

## Open Questions

- Whether a future `AI_INDEX.md` should replace the current legacy `README.md`.
- Whether implementation docs should later move into a dedicated `doc/ai/playbooks/` subfolder.

## Related Docs

- [README.md](./README.md)
- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [IMPLEMENTATION_PLAYBOOK_v1_0.md](./IMPLEMENTATION_PLAYBOOK_v1_0.md)
- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
