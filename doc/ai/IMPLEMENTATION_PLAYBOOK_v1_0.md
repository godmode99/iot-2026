---
id: AI-PLAYBOOK-01
type: spec
status: active
owners: [Pon]
depends_on: [AI-START-HERE, SB-00-TASKS, SB-00-FW-HW, SB-00-BACKEND-SEC]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# Implementation Playbook v1.0

## Purpose

This file defines how Codex should turn the current planning documents into implementation work.

Use it to answer:

- what order to execute the next software tasks
- what output each task should leave behind
- what kinds of assumptions are safe or unsafe
- how to avoid starting the wrong work too early

## Scope

This playbook covers the first implementation arc:

- `EX-01` workspace bootstrap
- `EX-03` firmware skeleton
- `EX-06` schema and migrations
- `EX-04` sensor drivers
- `EX-05` 4G and MQTT/TLS
- `EX-07` ingest path
- `EX-09` dashboard MVP
- `EX-11` QR + Web/PWA provisioning

It does not replace detailed subsystem specs.

## Source Of Truth Rules

- Execution order comes from the task list.
- Customer-facing behavior comes from the master assumptions and decision register.
- Subsystem constraints come from firmware, backend, and battery specs.
- This playbook defines working order and implementation discipline, not new product decisions.

## Dependencies

- [AI_START_HERE.md](./AI_START_HERE.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)

## Execution Principle

Build the shortest reliable path from:

`device -> MQTT -> backend -> database -> dashboard -> provisioning`

Do not optimize secondary features before this path exists end to end.

## Execution Order

| Order | Task | Why it comes now |
| --- | --- | --- |
| 1 | `EX-01` | creates the workspace, environment inventory, and runnable skeletons |
| 2 | `EX-03` | creates firmware runtime structure before device integrations |
| 3 | `EX-06` | creates database and schema baseline before ingest |
| 4 | `EX-04` | produces real sensor data on dev hardware |
| 5 | `EX-05` | moves real telemetry from device over 4G/MQTT |
| 6 | `EX-07` | stores telemetry and device status in backend and DB |
| 7 | `EX-09` | visualizes real data in dashboard MVP |
| 8 | `EX-11` | connects customer onboarding to actual device records |

## Required Output Per Stage

| Stage | Required output |
| --- | --- |
| `EX-01` | code workspaces, `.env.example`, runbook, secret checklist, bootable skeletons |
| `EX-03` | bootable ESP-IDF app with config, scheduler, watchdog, and structured logs |
| `EX-06` | migration files, schema notes, RLS baseline, seed or example data approach |
| `EX-04` | sensor reading modules plus example sample payload |
| `EX-05` | MQTT topic plan, TLS config path, reconnect and buffer policy |
| `EX-07` | backend ingest path, DB persistence, latest-status view |
| `EX-09` | dashboard pages for list, latest values, map, and chart |
| `EX-11` | QR scan to web flow that binds a device to a farm/account |

## Working Rules

1. Build working scaffolds before deep feature work.
2. Make contracts explicit early:
   - telemetry payload shape
   - device identity fields
   - battery metadata fields
   - MQTT topic naming
3. Keep environment variables stable once published in `.env.example`.
4. Do not block progress on perfect UI, perfect hardware, or optional post-pilot work.
5. Prefer mockable seams where external services are not yet connected.
6. Leave evidence:
   - sample payload
   - run command
   - migration command
   - README or runbook updates

## Safe Assumptions

- `ESP-IDF v5.x` is the firmware baseline.
- `Supabase` is the database baseline.
- `QR + Web/PWA` is the only customer provisioning path in MVP and pilot.
- `Standard` and `Long-Life` battery variants must both remain supported in metadata design.
- The repository currently needs scaffold work before feature work.

## Unsafe Assumptions

- assuming a native mobile app exists
- assuming BLE is part of MVP customer flow
- assuming only one battery variant exists
- assuming dashboard and backend must live in one code package
- assuming secrets already exist locally

## Expected Repository Shape After EX-01

```text
firmware/
backend/
dashboard/
shared/
ops/
```

Minimum repo-level support files should include:

- `.env.example`
- `RUNBOOK.md`
- package or build configuration for each app

## Definition Of Done Discipline

For implementation tasks in this phase, done means:

- the code or scaffold exists
- the command to run it exists
- the command has been validated if practical
- the next dependent task can start without document reinterpretation

It does not mean:

- production hardening is complete
- UX is polished
- pilot operations are finished

## Handoff Expectations

When a task is completed, leave behind:

- changed files
- run/build/test command used
- known gaps
- exact next task unlocked

## Anti-Patterns To Avoid

- creating empty folders with no runnable entrypoint
- naming env vars ad hoc during implementation
- postponing contract definition until after multiple components already exist
- building provisioning or dashboard flows before device and status data models exist
- adding post-pilot experiments to MVP critical path

## Acceptance Criteria

- The first implementation arc is sequenced clearly.
- Codex can use this file to decide what to implement next.
- Required outputs per phase are explicit.
- Working rules prevent drift away from the locked baseline.

## Open Questions

- Whether `shared/` should become a package or stay as simple schema references at first.
- Whether backend and dashboard should be separate apps or a shared monorepo package layout.

## Related Docs

- [AI_START_HERE.md](./AI_START_HERE.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
- [EX-01_BOOTSTRAP_SPEC_v1_0.md](./EX-01_BOOTSTRAP_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
