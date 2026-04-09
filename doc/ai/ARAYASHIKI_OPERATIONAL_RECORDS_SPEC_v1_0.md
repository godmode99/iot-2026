---
id: ARAYASHIKI-OPERATIONAL-RECORDS-SPEC
type: spec
version: v1.0
status: draft
owner: Codex
updated_at: 2026-04-09
depends_on:
  - ARAYASHIKI-PHASE1-IMPLEMENTATION-SCOPE
  - EX-06-SCHEMA-SPEC
  - SB-00-UX-FLOW
---

# ArayaShiki Operational Records Spec v1.0

## Purpose

Define the first production-grade operational records layer for `Daily Complete`.

This module exists so hatchery, farm, and research teams can record repeatable field work in a structured form before deeper automation arrives.

## Phase 1 Scope

Phase 1 operational records must support:

- record list
- create record flow
- structured template selection
- farm-scoped history
- created by / created at traceability
- basic record status: `draft`, `submitted`

Phase 1 does not need:

- approval workflow
- revision history UI
- file attachments
- complex experiment branching
- automation write-back

## Recommended Data Model

### `record_templates`

- `id`
- `organization_id`
- `code`
- `name`
- `description`
- `scope_type`
- `is_active`
- `created_at`

### `operational_records`

- `id`
- `organization_id`
- `farm_id`
- `hatchery_id`
- `template_id`
- `record_status`
- `recorded_for_date`
- `created_by`
- `submitted_at`
- `notes_summary`
- `created_at`
- `updated_at`

### `record_entries`

- `id`
- `record_id`
- `field_key`
- `field_type`
- `label`
- `value_text`
- `value_number`
- `value_boolean`
- `value_json`
- `unit`
- `sort_order`

## Required UX Surfaces

- `/records`
- `/records/new`
- explicit empty state
- explicit error state
- explicit no-template state

## Immediate Next Step

1. add records to authenticated navigation
2. add records list and create shells
3. wire backend schema after UI scaffolding exists

