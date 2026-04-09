# Documentation Structure

The `doc/` folder is split into two main layers:

- `doc/ai/`
  - source-of-truth Markdown for AI assistants and implementation work
  - includes both company-level narrative and product-level execution docs
- `doc/human/`
  - generated `.docx` documents for human readers
  - grouped from the source files in `doc/ai/`

## Suggested Reading Paths

### 1. Company / positioning path

Use this path when you need to understand how `ArayaShiki Lab` should be presented:

1. `doc/ai/ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md`
2. `doc/ai/HB-05_Business_And_Launch_v1_0.md`
3. `doc/ai/SB-00_Business_Roadmap_v1_1.md`

### 2. Product / implementation path

Use this path when you need to work inside the repository:

1. `doc/ai/AI_START_HERE.md`
2. `doc/ai/SB-00_Master_Assumptions_v1_1.md`
3. `doc/ai/SB-00_Decision_Register_v1_1.md`
4. `doc/ai/SB-00_Execution_Task_List_v1_1.md`

## Workflow

1. Edit source documents in `doc/ai/`
2. Run `python scripts/build_human_docs.py`
3. Open `doc/human/SB-00_Document_Index_v1_1.docx`
4. If needed, refresh fields and page numbers in Microsoft Word

## Notes

- Update `doc/ai/ARAYASHIKI_ECOSYSTEM_NARRATIVE_v1_0.md` first when company-level narrative changes
- Update `doc/ai/SB-00_Third_Party_Pricing_Baseline_v1_1.md` first when pricing or limits change
- Update `doc/ai/` before rebuilding `doc/human/`
