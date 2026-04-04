---
id: EX-15-FIELD-TEST-SPEC
type: spec
status: ready
owners: [Pon, A]
depends_on: [EX-09-DASHBOARD-MVP-SPEC, EX-10-ALERTS-SPEC, EX-11-PROVISIONING-SPEC, EX-13-POWER-RUNTIME-SPEC]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-15 Seven-Day Field Test Spec v1.0

## Purpose

This file defines the first engineering field test before pilot preparation continues.

Use it to answer:

- what must be tested in real deployment conditions
- what evidence must be collected during the 7-day run
- what constitutes pass or fail against the current baseline

## Scope

`EX-15` covers:

- 7-day real-world deployment
- telemetry continuity
- battery behavior
- connectivity stability
- GPS usefulness
- sensor stability
- operational summary and pass/fail conclusion

It does not cover:

- final pilot launch
- production batch QC
- commercial support readiness

## Source Of Truth Rules

- This file is authoritative for `EX-15`.
- Field evidence must be compared against current locked baseline rather than intuition.
- Any baseline-breaking result should trigger explicit document or task updates.

## Dependencies

- [EX-09_DASHBOARD_MVP_SPEC_v1_0.md](./EX-09_DASHBOARD_MVP_SPEC_v1_0.md)
- [EX-10_ALERTS_SPEC_v1_0.md](./EX-10_ALERTS_SPEC_v1_0.md)
- [EX-11_PROVISIONING_SPEC_v1_0.md](./EX-11_PROVISIONING_SPEC_v1_0.md)
- [EX-13_POWER_RUNTIME_SPEC_v1_0.md](./EX-13_POWER_RUNTIME_SPEC_v1_0.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)

## Objective

Verify that the prototype behaves acceptably in a 7-day engineering deployment and gather evidence needed before PCB, enclosure, and pilot hardening continue.

## Required Validation Areas

The field test must evaluate:

- telemetry continuity
- battery/runtime behavior
- connectivity and reconnect stability
- GPS quality relative to current expectations
- sensor stability and fault rate
- alert usefulness

## Required Evidence

The field test should capture:

- deployment start and end time
- device and battery variant used
- interval profile used
- dashboard evidence or exports
- alert events observed
- battery trend over time
- network interruption or reconnect incidents
- GPS anomalies or false movement behavior
- sensor read failures or suspicious drift

## Suggested Daily Checkpoints

At minimum, record:

- whether telemetry continued
- whether device stayed online as expected
- whether battery trend remained reasonable
- whether alerts were useful or noisy

## Pass Or Fail Conclusion Must Cover

- did runtime behavior stay within acceptable expectation
- did connectivity remain operational enough for prototype goals
- did GPS behave within acceptable tolerance
- did sensors remain stable enough for the next stage
- what must be fixed before PCB or pilot prep continues

## Required Output

The field test must leave behind one short report that includes:

- setup summary
- observed issues
- evidence summary
- pass/fail conclusion
- recommended next actions

## Minimal Pass Criteria

- telemetry remains available for most of the test
- no unrecoverable device failure
- battery trend is consistent with measured expectations
- major sensor or GPS faults are understood and bounded
- issues are actionable rather than unknown

## Minimal Fail Criteria

- repeated unrecoverable dropouts
- runtime far below measured expectation with no clear explanation
- severe GPS behavior that breaks expected use
- sensor instability that makes data unreliable

## Non-Goals

- polished customer reporting
- formal certification evidence
- final pilot acceptance sign-off

## Definition Of Done

`EX-15` is done when all of the following are true:

1. one 7-day field test has been completed
2. required evidence has been collected
3. runtime, connectivity, GPS, and sensor behavior are summarized
4. one pass/fail conclusion exists against the current baseline
5. next engineering actions are listed clearly

## Acceptance Criteria

- The team has real deployment evidence, not only bench assumptions.
- The result is concrete enough to guide the next engineering stage.
- Field findings are compared to locked baseline targets and rules.

## Open Questions

- Whether the first field test should use only `standard` battery or include a `long_life` comparison run later.
- Whether the first test site should optimize for easy recovery or for harsher real-world conditions.

## Related Docs

- [EX-10_ALERTS_SPEC_v1_0.md](./EX-10_ALERTS_SPEC_v1_0.md)
- [EX-13_POWER_RUNTIME_SPEC_v1_0.md](./EX-13_POWER_RUNTIME_SPEC_v1_0.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
