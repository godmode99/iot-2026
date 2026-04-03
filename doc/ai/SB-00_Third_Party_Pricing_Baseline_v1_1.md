---
id: SB-00-PRICING-BASELINE
type: reference
status: active
owners: [Pon]
depends_on: [SB-00-MASTER]
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 Third-Party Pricing Baseline

## Purpose

This file is the canonical pricing and quota baseline for third-party services used in SB-00 planning.

Use it when an AI-facing doc needs:

- free-tier assumptions
- upgrade triggers
- recurring service cost estimates

## Scope

This file covers planning estimates for external services only.

It does not cover:

- hardware BOM pricing
- live vendor quotes
- customer-facing price lists

## Source Of Truth Rules

- If another doc mentions pricing or free-tier limits for these services, this file is the reference to align against.
- `Verified on` in this file means planning-sync date, not live vendor verification.
- Before commercial launch, volatile service pricing should be re-verified.

## Dependencies

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)

## Canonical Table

| Service | Use case | Free tier / included | Upgrade trigger | Planning estimate | Verified on | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| HiveMQ Cloud | MQTT broker | 100 connections | > 100 devices | ~$25/mo (~900 THB/mo) | 2026-04-02 planning sync | primary broker |
| Supabase | DB, auth, realtime fallback | 500MB DB, 50k rows/day | ~60+ devices or DB growth beyond free tier | ~$25/mo (~900 THB/mo) | 2026-04-02 planning sync | planning estimate |
| Upstash Redis | cache, rate limit, pub-sub assist | 10,000 req/day | ~17+ devices | ~$5/mo | 2026-04-02 planning sync | planning estimate |
| Upstash QStash | queue, retry, webhook buffer | 500 msg/day | 2 active devices in parallel dev/test or > 500 msg/day | ~$4/mo (~144 THB/mo) | 2026-04-02 planning sync | can become paid in Phase 1 dev/test |
| Vercel Hobby/Pro | hosting, serverless | Hobby free | ~50+ devices or hobby-tier limits reached | Pro ~$20/mo (~720 THB/mo) | 2026-04-02 planning sync | planning estimate |
| LINE Messaging API / OA | push alerts | free tier around 200 msg/mo | > 200 msg/mo | ~150 THB/mo planning estimate | 2026-04-02 planning sync | re-check before commercial launch |
| Resend | email alerts and reports | 3,000 emails/mo | ~88+ devices | ~$20/mo (~720 THB/mo) | 2026-04-02 planning sync | planning estimate |
| Sentry | error monitoring | 5,000 errors/mo | large pilot or production growth | ~$26/mo (~936 THB/mo) | 2026-04-02 planning sync | planning estimate |
| Stripe | global billing | no setup fee | when paid global customers exist | 3.65% per transaction | 2026-04-02 planning sync | transaction-based |
| Omise | Thai billing / PromptPay | no setup fee | when paid Thai customers exist | 3.65% per transaction | 2026-04-02 planning sync | transaction-based |

## Usage Rules

- Reuse the wording in `Planning estimate` when other documents summarize recurring costs.
- Update this file first if pricing assumptions change.
- Sync dependent backend, roadmap, and procurement docs after this file is updated.

## Operational Notes

- Treat all listed values as planning assumptions only.
- Free-tier calculations should follow the shared telemetry baseline in the master assumptions file.
- The QStash row is intentionally called out because it may exceed free tier early during parallel development/testing.

## Acceptance Criteria

- Third-party service assumptions appear in one canonical AI-facing file.
- Other docs can cite this file instead of duplicating service pricing details.

## Open Questions

- Whether QStash remains necessary after the initial backend architecture hardens.
- Whether LINE alert volume assumptions should be recalculated after pilot alert tuning.

## Related Docs

- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md)
- [SB-00_Business_Roadmap_v1_1.md](./SB-00_Business_Roadmap_v1_1.md)
