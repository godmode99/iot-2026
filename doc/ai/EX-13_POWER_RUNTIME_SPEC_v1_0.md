---
id: EX-13-POWER-RUNTIME-SPEC
type: spec
status: ready
owners: [Pon, A]
depends_on: [EX-12-BENCH-SOAK-SPEC, SB-00-FW-HW, SB-00-BATTERY-PROFILES]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-13 Power Measurement And Runtime Spec v1.0

## Purpose

This file defines how to measure current draw and estimate runtime against the locked battery targets.

Use it to answer:

- what should be measured
- how runtime should be estimated
- what evidence is needed before field testing

## Scope

`EX-13` covers:

- current draw measurement
- active and sleep phase analysis
- runtime estimation using measured values
- comparison against `standard` and `long_life` battery targets

It does not cover:

- final commercial battery claims
- enclosure thermal validation
- long-term degradation modeling

## Source Of Truth Rules

- This file is authoritative for `EX-13`.
- Use the battery profile table for canonical usable capacity values.
- Use measured evidence over assumptions when both exist.

## Dependencies

- [EX-12_BENCH_SOAK_SPEC_v1_0.md](./EX-12_BENCH_SOAK_SPEC_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)

## Objective

Measure the real power profile of the prototype and estimate runtime against the locked targets:

- `standard`: `>= 12 days @ 5-minute interval`
- `long_life`: `>= 30 days @ 5-minute interval` or `>= 60 days @ 10-minute interval`

The output must be good enough to unlock:

- `EX-15`
- later battery design review

## Required Measurement Areas

Measure at minimum:

- boot phase current
- sensor read phase current
- network attach and publish current
- idle or deep-sleep current
- total cycle duration

## Required Runtime Calculation Inputs

- usable battery capacity from canonical profile
- interval length
- average current or energy per cycle
- sleep current contribution
- retransmit or reconnect penalty if observed materially

## Required Outputs

The power study should produce:

- one measurement table
- one runtime estimate for `standard`
- one runtime estimate for `long_life`
- one gap analysis against target

## Required Comparison Rules

- compare measured estimate to locked target
- do not silently change battery claims to match measured data
- if target is missed, record the gap and likely contributors

## Suggested Result Categories

- `meets target`
- `near target with optimization required`
- `misses target materially`

## Non-Goals

- marketing-ready runtime numbers
- seasonal weather correction
- full aging curve model

## Definition Of Done

`EX-13` is done when all of the following are true:

1. current draw has been measured across key phases
2. runtime has been estimated using measured values
3. both `standard` and `long_life` scenarios are reported
4. result is compared to locked targets
5. a short gap list exists for any missed target

## Acceptance Criteria

- Runtime estimates are based on measured evidence, not only assumptions.
- Results are clearly mapped to canonical battery profiles.
- The team can use the output to decide whether field testing is acceptable.

## Open Questions

- Whether reconnect-heavy conditions should be modeled as a second runtime scenario.
- Whether night interval behavior should be included in the first estimate or as a follow-up analysis.

## Related Docs

- [EX-12_BENCH_SOAK_SPEC_v1_0.md](./EX-12_BENCH_SOAK_SPEC_v1_0.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
- [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)
