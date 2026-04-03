---
id: AI-DOC-STANDARD
type: standard
status: active
owners: [Pon]
depends_on: []
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---

# AI Documentation Standard

## Purpose

This file defines the writing standard for `doc/ai/`.

The goal is to make AI-facing documents:

- easy to retrieve
- easy to diff
- easy to convert into implementation tasks
- explicit about source of truth and dependency order

## Scope

This standard applies to all AI-facing documents in `doc/ai/`, especially:

- decisions
- tasks
- specifications
- references

It does not replace the simplified grouped documents in `doc/human/`.

## Document Types

| Type | Purpose | Rules |
| --- | --- | --- |
| `master` | Canonical baseline shared by other docs | One file only per version; conflicts resolve here first |
| `decision` | Locked decisions with rationale and review history | Must state status, owner, date, and downstream impact |
| `task` | Ready-to-execute work items | Must include owner, dependencies, and acceptance criteria |
| `spec` | System behavior, interfaces, and implementation requirements | Must be explicit and testable |
| `reference` | Context, estimates, procurement, pricing, roadmap | Must not override `master`, `decision`, or `spec` |
| `standard` | Writing rules or process conventions | Used to define cross-document format |

## Required Front Matter

Every AI-facing document should start with YAML front matter:

```yaml
---
id: DEC-01
type: decision
status: closed
owners: [Pon]
depends_on: []
source_of_truth: true
last_updated: 2026-04-03
language: English-first
audience: ai
---
```

## Required Sections

Every new or rewritten AI document should use these sections when applicable:

1. `Purpose`
2. `Scope`
3. `Source Of Truth Rules`
4. `Dependencies`
5. `Core Content`
6. `Acceptance Criteria`
7. `Open Questions`
8. `Related Docs`

Section names should stay stable across files.

## Writing Rules

- Use English as the primary language.
- Use Thai only when a Thai business term or user-facing phrase is required.
- Prefer tables, bullets, and checklists over long prose.
- Keep each statement atomic when possible.
- Use consistent IDs such as `D-01`, `EX-08A`, `SPEC-BATT-01`.
- State whether a file is authoritative or reference-only.
- Avoid repeating the same baseline text in multiple places unless needed for execution clarity.

## Source Of Truth Rules

- `master` overrides `reference`.
- `decision` closes ambiguity that remains inside `master`.
- `task` must follow `master` and closed `decision` items.
- `reference` cannot change execution behavior by itself.
- When conflicts exist, update `master` and `decision` first, then sync dependent docs.

## Task Rules

Every task entry should include:

- ID
- owner
- dependencies
- current status when tracked
- definition of done
- deliverables when non-obvious

## Decision Rules

Every decision entry should include:

- decision ID
- status
- owner
- closing date or review date
- chosen option
- rationale
- downstream docs or systems affected

## Spec Rules

Every spec should define:

- required inputs
- required outputs
- constraints
- compatibility assumptions
- acceptance criteria

## Naming Guidance

- Keep stable legacy filenames if rename risk is high.
- Prefer stable IDs inside front matter even when filenames remain legacy.
- Use uppercase IDs and lowercase type values.

## Migration Plan

Priority order for migration to this standard:

1. `SB-00_Master_Assumptions_v1_1.md`
2. `SB-00_Decision_Register_v1_1.md`
3. `SB-00_Execution_Task_List_v1_1.md`
4. `SB-00_Firmware_Hardware_v1_1.md`
5. `SB-00_Backend_Security_v1_1.md`
6. battery platform specs and references

## Acceptance Criteria

- New AI-facing docs use front matter.
- Core execution docs are English-first.
- Task ownership and dependencies are explicit.
- Decision closure status is explicit.
- Human-facing grouped docs remain separate from this standard.

## Open Questions

- Whether to move files into type-based subfolders later.
- Whether to add automated linting for AI doc front matter.

## Related Docs

- [HUMAN_README.md](./HUMAN_README.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)
