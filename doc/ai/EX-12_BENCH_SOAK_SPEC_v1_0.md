---
id: EX-12-BENCH-SOAK-SPEC
type: spec
status: ready
owners: [Pon, A]
depends_on: [EX-04-SENSOR-DRIVERS-SPEC, EX-05-CONNECTIVITY-SPEC, EX-07-INGEST-SPEC]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-12 48-Hour Bench Soak Spec v1.0

## Purpose

This file defines the first sustained bench validation run for the prototype system.

Use it to answer:

- what behavior must be observed over 48 hours
- what pass or fail signals matter most
- what evidence must be collected

## Scope

`EX-12` covers:

- 48-hour continuous bench run
- repeated sensor reads
- MQTT reconnect behavior
- buffer flush behavior
- reboot and power-cycle recovery

It does not cover:

- 7-day field deployment
- waterproof validation
- pilot readiness sign-off

## Source Of Truth Rules

- This file is authoritative for `EX-12`.
- Treat soak evidence as a validation gate, not as a product decision by itself.
- If the soak uncovers baseline-breaking behavior, update the affected specs and tasks explicitly.

## Dependencies

- [EX-04_SENSOR_DRIVERS_SPEC_v1_0.md](./EX-04_SENSOR_DRIVERS_SPEC_v1_0.md)
- [EX-05_CONNECTIVITY_SPEC_v1_0.md](./EX-05_CONNECTIVITY_SPEC_v1_0.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)

## Objective

Validate that the prototype can keep reading, publishing, reconnecting, and recovering over a sustained bench run without obvious data corruption or instability.

The output must be good enough to unlock:

- `EX-13`
- `EX-15`

## Required Test Conditions

The soak should run long enough to cover:

- repeated sensor cycles
- normal successful publishes
- at least one forced or natural reconnect event
- at least one device reboot or power-cycle recovery check

## Required Behaviors To Observe

- sensor reads continue over time
- telemetry continues to land in storage
- reconnect works after network interruption
- buffered payloads flush after reconnect
- device can resume correctly after restart or power cycle

## Required Evidence

The soak should produce:

- test start and end timestamps
- firmware logs
- ingest or backend logs
- count of successful telemetry writes
- count of failed publishes or reconnects
- notes on resets, crashes, or hangs

## Suggested Failure Injection

At minimum, the bench soak should include one or more of:

- temporary network interruption
- controlled device reboot
- brief power removal and restore

## Minimal Pass Criteria

- no repeated crash loop
- no obvious data corruption
- reconnect path works
- buffer flush path works
- device returns to expected cycle after restart

## Minimal Fail Criteria

- unrecoverable crash loop
- persistent inability to reconnect
- payload loss without clear explanation
- corrupted timestamps or invalid sample structure after recovery

## Non-Goals

- full battery runtime proof
- environmental weather validation
- final production reliability sign-off

## Definition Of Done

`EX-12` is done when all of the following are true:

1. one 48-hour bench run has been completed
2. required evidence has been captured
3. reconnect and buffer flush have been observed or explicitly tested
4. restart or power-cycle recovery has been verified
5. a short pass/fail summary and issue list exists

## Acceptance Criteria

- The prototype survives the first sustained bench test without hidden failure modes.
- Evidence is sufficient to drive the next power and field validation steps.
- Failure modes, if any, are concrete and actionable.

## Open Questions

- Whether a second soak pass should be required after critical fixes.
- Whether the first soak should run at the target 5-minute interval only or include interval changes.

## Related Docs

- [EX-05_CONNECTIVITY_SPEC_v1_0.md](./EX-05_CONNECTIVITY_SPEC_v1_0.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
