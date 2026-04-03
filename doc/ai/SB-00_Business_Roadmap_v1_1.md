---
id: SB-00-BUSINESS-ROADMAP
type: reference
status: active
owners: [Pon, A]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-PRICING-BASELINE]
source_of_truth: false
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Business Roadmap

## Purpose

This file summarizes the commercial direction for SB-00 so AI-facing planning can stay aligned with product and pricing intent.

Use it for:

- SKU strategy
- pricing direction
- launch staging
- post-pilot priorities

## Scope

This is a business and planning reference.

It does not override:

- technical baseline
- execution sequencing
- live pricing verification

## Source Of Truth Rules

- Treat this file as roadmap context, not technical source of truth.
- Use the pricing baseline file for third-party service estimates.
- Use the master assumptions and decision files for technical constraints.

## Dependencies

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md)

## Revenue Model

| Stream | Direction |
| --- | --- |
| Hardware Standard | main device SKU |
| Hardware Long-Life | runtime-upgrade SKU |
| SaaS Basic | dashboard, alerts, limited retention |
| SaaS Pro | analytics, API, extended retention, team features |
| SIM resale | optional add-on |
| replacement parts | optional add-on |

## SKU Strategy

| SKU | Positioning | Battery strategy | Runtime direction |
| --- | --- | --- | --- |
| `Standard` | main SKU | default battery module | `>= 12 days @ 5-minute interval` baseline |
| `Long-Life` | upsell SKU | larger service-upgradeable battery module | `>= 30 days @ 5-minute interval` or `>= 60 days @ 10-minute interval` target |

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
| Phase 3 | run pilot, close launch readiness gaps, and build early demand |
| Commercial launch | start paid sales after readiness and approvals are in place |

## Launch Readiness Signals

Business-side launch readiness should include:

- stable pilot evidence
- at least a small set of real pilot farms
- clear onboarding and support path
- initial sales or waitlist confidence
- regulatory path in progress or complete, according to launch type

## Post-Pilot Priorities

Ordered direction:

1. mobile/PWA optimization
2. additional sensors such as pH and DO
3. solar option
4. analytics or anomaly detection
5. future product variants such as fixed-install systems

## Risk Notes

| Risk | Why it matters |
| --- | --- |
| regulatory delay | blocks paid public launch even if pilot is successful |
| firmware or field instability | delays conversion from pilot to sales |
| battery/runtime mismatch | affects SKU promise and trust |
| scope creep from pilot feedback | can delay launch if not prioritized |
| two-person team load | affects schedule reliability and quality |

## Acceptance Criteria

- Business planning reflects the `Standard` and `Long-Life` battery strategy.
- Commercial direction does not conflict with the technical baseline.
- Price and roadmap summaries are compact enough to support AI planning.

## Open Questions

- Whether `Long-Life` should launch with the first commercial batch or later as an upgrade-only path.
- Whether the pause-plan concept should be part of launch scope or follow after pilot.

## Related Docs

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md)
- [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md)
