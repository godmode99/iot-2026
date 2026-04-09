---
id: SB-00-BUSINESS-ROADMAP
type: reference
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-PRICING-BASELINE]
source_of_truth: false
last_updated: 2026-04-09
language: English-first
audience: ai
---

# SB-00 Business Roadmap

## Purpose

This file summarizes the commercial direction for `SB-00` as one active path inside the broader `ArayaShiki Lab` ecosystem.

Use it for:

- `SB-00` launch staging
- pricing direction for the monitoring path
- product packaging alignment
- post-pilot priorities

## Scope

This is a roadmap and planning reference for `SB-00`.

It does not override:

- company-level positioning
- technical baseline
- execution sequencing
- live pricing verification

## Source Of Truth Rules

- Use `ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md` for company-level positioning.
- Use this file for `SB-00` commercial direction only.
- Use the pricing baseline file for third-party service estimates.
- Use the master assumptions and decision files for technical constraints.

## Dependencies

- [ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md](./ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md)

## Roadmap Position Inside The Company

`SB-00` should be treated as:

- the current monitoring-led pilot path
- an important proof point for the broader ecosystem
- not the full boundary of the company story

Relationship to the broader company:

- `ArayaShiki Lab` = ecosystem company
- `Daily Complete` = flagship operating layer
- `SB-00` = active monitoring and telemetry path feeding that ecosystem

## Commercial Role Of SB-00

The commercial role of `SB-00` is to prove that the ecosystem can support:

- reliable field telemetry
- dashboard visibility
- pilot onboarding
- a practical starting point for future rule-based automation

This means `SB-00` should be sold and described as an enabling path, not as the only thing the company can ever become.

## Revenue Model Direction

| Stream | Direction |
| --- | --- |
| Hardware Standard | main monitoring device SKU |
| Hardware Long-Life | runtime-upgrade SKU |
| SaaS Basic | dashboard, alerts, limited retention |
| SaaS Pro | analytics, API, extended retention, team features |
| SIM resale | optional add-on |
| replacement parts | optional add-on |

## SKU Strategy

| SKU | Positioning | Battery strategy | Runtime direction |
| --- | --- | --- | --- |
| `Standard` | main monitoring SKU | default battery module | `>= 12 days @ 5-minute interval` baseline |
| `Long-Life` | upsell monitoring SKU | larger service-upgradeable battery module | `>= 30 days @ 5-minute interval` or `>= 60 days @ 10-minute interval` target |

Rules:

- Keep both SKUs on the same core architecture.
- Do not split provisioning, firmware, or backend by SKU.
- Use `Long-Life` as a commercial upgrade path rather than a separate product family.

## Pricing Direction

### Hardware

| SKU | Direction |
| --- | --- |
| `Standard` | approximately `4,500-6,000 THB` per unit |
| `Long-Life` | approximately `6,500-9,000+ THB` depending on final battery and enclosure cost |

### SaaS

| Plan | Direction |
| --- | --- |
| Basic | around `299 THB/mo` |
| Pro | around `599 THB/mo` |
| Pause / low-activity option | optional low-fee retention plan |

Notes:

- These are planning directions, not final published prices.
- Hardware margin and SaaS margin should be reviewed again after pilot evidence and final COGS.

## Launch Staging

| Stage | Goal |
| --- | --- |
| Phase 1 | prove prototype, telemetry, enclosure, and runtime baseline |
| Phase 2 | prepare custom PCB, pilot hardware, and regulatory path |
| Phase 3 | run pilot, close `SB-00` launch readiness gaps, and build early demand |
| Commercial launch | start paid monitoring-path sales after readiness and approvals are in place |

## Readiness Signals

`SB-00` launch readiness should include:

- stable pilot evidence
- at least a small set of real pilot farms or field sites
- clear onboarding and support path
- initial demand confidence
- regulatory path in progress or complete, according to launch type

## Post-Pilot Priorities

Ordered direction for the `SB-00` path:

1. mobile/PWA optimization
2. additional sensors such as pH and DO
3. solar option
4. analytics or anomaly detection
5. tighter connection into broader automation workflows

This last point matters because `SB-00` should eventually support the ecosystem roadmap instead of remaining an isolated monitoring line.

## Risk Notes

| Risk | Why it matters |
| --- | --- |
| regulatory delay | blocks paid public launch even if pilot is successful |
| firmware or field instability | delays conversion from pilot to sales |
| battery/runtime mismatch | affects SKU promise and trust |
| scope creep from pilot feedback | can delay launch if not prioritized |
| two-person team load | affects schedule reliability and quality |
| narrative drift | can cause `SB-00` to be mistaken for the whole company instead of one ecosystem path |

## Acceptance Criteria

- `SB-00` business planning reflects the `Standard` and `Long-Life` battery strategy.
- Commercial direction does not conflict with the broader company narrative.
- The file is explicit that `SB-00` is a path inside the ArayaShiki ecosystem.
- Price and roadmap summaries remain compact enough to support AI planning.

## Open Questions

- Whether `Long-Life` should launch with the first commercial batch or later as an upgrade-only path.
- Whether the pause-plan concept should be part of launch scope or follow after pilot.
- When `SB-00` should be explicitly packaged under `Farm Operations` versus `Enterprise & Custom Automation`.

## Related Docs

- [ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md](./ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md)
- [HB-05_Business_And_Launch_v1_0.md](./HB-05_Business_And_Launch_v1_0.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md)
- [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md)
