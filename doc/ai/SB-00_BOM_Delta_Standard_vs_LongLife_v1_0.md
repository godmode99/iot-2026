---
id: SB-00-BOM-DELTA
type: reference
status: active
owners: [Pon, A]
depends_on: [SB-00-BATTERY-INTERFACE, SB-00-PROCUREMENT, SB-00-BUSINESS-ROADMAP]
source_of_truth: false
last_updated: 2026-04-03
language: English-first
audience: ai
---

# SB-00 BOM Delta: Standard vs Long-Life

## Purpose

This file summarizes the BOM difference between `Standard` and `Long-Life`.

Use it for:

- SKU discussion
- battery-platform tradeoff review
- procurement and enclosure planning

## Scope

This is a comparative planning reference.

It does not replace:

- final BOM
- battery interface spec
- final production quote

## Source Of Truth Rules

- Shared architecture rules come from the battery interface spec.
- This file only highlights the difference between variants.
- Cost values here are working estimates, not final supplier quotes.

## Dependencies

- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
- [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md)
- [SB-00_Business_Roadmap_v1_1.md](./SB-00_Business_Roadmap_v1_1.md)

## Shared BOM

These remain shared across both variants:

- core board
- 4G module
- GPS module
- sensor stack
- antenna position and bulkhead concept
- sensor-side connectors
- customer provisioning QR flow
- shared firmware, backend, and dashboard logic

## Delta Table

| Area | `Standard` | `Long-Life` | Effect |
| --- | --- | --- | --- |
| Battery cells | `18650 x2` class path | `18650 x8-x10` class path | higher cost and weight |
| Battery hardware | small holder or parallel pack | larger battery module, welded pack, or service tray | more complex assembly and service |
| Usable capacity | ~`5600 mAh` | ~`23200 mAh` | much longer runtime |
| Enclosure | baseline `150 x 100 x 60 mm` | same core footprint with larger battery bay or depth | larger mechanical envelope |
| Service procedure | baseline battery service | service-only upgrade path | requires stronger SOP and service control |
| Charging / recovery | baseline USB-C service path | may require longer charge/service handling | higher service effort |

## Rough Cost Delta

| Cost item | `Standard` | `Long-Life` | Delta |
| --- | --- | --- | --- |
| Battery cells | ~250-300 THB | ~1,200-1,500 THB | `+900 to +1,250 THB` |
| Battery hardware | ~60-80 THB | TBD | additional pack/module cost |
| Enclosure print | baseline | TBD | higher cost from larger battery section |
| Assembly labor | baseline | TBD | more assembly and service effort |

Note:

- `Long-Life` numbers here are working estimates for planning and internal tradeoff review.

## Decision Questions Supported By This File

Use this file to answer:

1. whether `Long-Life` is commercially justified as an optional SKU
2. whether the pack should target 8 or 10 cells
3. how much enclosure growth is acceptable relative to runtime gain

## Working Conclusion

1. `Standard` should remain the primary SKU.
2. `Long-Life` should remain an optional upgrade or upsell path.
3. Splitting variants at battery and enclosure level is more efficient than splitting the full product line.

## Acceptance Criteria

- Shared architecture stays explicit.
- Key cost and mechanical differences are visible in one page.
- Variant strategy aligns with the business roadmap and battery interface spec.

## Open Questions

- Whether the first pilot batch should include a `Long-Life` validation unit.
- Whether final battery-pack construction should use holder, welded pack, or another service-safe design.

## Related Docs

- [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md)
- [SB-00_Battery_Profile_Table_v1_0.md](./SB-00_Battery_Profile_Table_v1_0.md)
- [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md)
- [SB-00_Business_Roadmap_v1_1.md](./SB-00_Business_Roadmap_v1_1.md)
