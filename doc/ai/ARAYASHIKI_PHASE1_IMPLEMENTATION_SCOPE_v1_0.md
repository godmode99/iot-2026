---
id: ARAYASHIKI-PHASE1-IMPLEMENTATION-SCOPE
type: implementation_plan
version: v1.0
status: draft
owner: Codex
updated_at: 2026-04-09
depends_on:
  - ARAYASHIKI-ECOSYSTEM-NARRATIVE
  - EX-06-SCHEMA-SPEC
  - EX-07-INGEST-SPEC
  - EX-09-DASHBOARD-MVP-SPEC
  - EX-10-ALERTS-SPEC
  - SB-00-AUTH-ROLE-SPEC
---

# ArayaShiki Phase 1 Implementation Scope v1.0

## Purpose

This file translates the company-level ecosystem narrative into the first practical product scope that can be built now.

It defines:
- what Phase 1 must include
- what Phase 1 explicitly does not include
- what the first shared data model must support
- what screens and workflows are required
- what order implementation should follow

This is not a long-term roadmap.
This is the first executable delivery scope for `Daily Complete` inside the `ArayaShiki Lab` ecosystem.

---

## Phase 1 Product Goal

Deliver the first usable operating layer for hatchery and farm teams that can:

1. capture structured operational data from people
2. show device and telemetry status in one place
3. surface basic alerts
4. support real users, farms, and permissions
5. establish the data and UX foundation for future automation

In short:

Phase 1 is `manual operations + monitoring + alerts + shared foundation`.

It is not yet the full automation product.

---

## Phase 1 Must-Have Scope

### 1. Shared Foundation

- organization model
- farm / hatchery / site structure
- user profile
- farm membership
- role / permission model
- auth and onboarding
- language support already used by dashboard
- audit-ready core actions

### 2. Manual Operational Data Capture

- create daily records
- edit daily records
- view daily records
- log water quality inputs
- log operational notes
- log checklist-style work
- attach records to a farm / hatchery / tank / batch context
- support structured fields instead of free-text only

### 3. Device And Monitoring Layer

- device registry
- device detail page
- device online / offline state
- latest telemetry view
- historical telemetry view
- farm-level monitoring overview
- explicit empty / loading / offline states

### 4. Alerts MVP

- threshold alert
- device offline alert
- low battery or device-health alert when available
- alert state transitions
- acknowledge / resolve flow
- alert history

### 5. Core Navigation And Operator UX

- dashboard home
- farm context navigation
- device list
- device detail
- records list
- record entry flow
- alerts list
- onboarding / auth guard

---

## Explicitly Out Of Scope For Phase 1

These items are important, but they should not block first delivery:

- advanced workflow automation
- multi-step process orchestration
- salinity mixing engine
- actuator sequencing across multiple systems
- enterprise custom automation builder
- research experiment module beyond structured records
- advanced analytics and forecasting
- package-level billing logic
- complex customer self-service provisioning beyond current MVP direction

Rule of thumb:

If a feature requires process automation logic instead of visibility, capture, or alerts, it is probably Phase 2+.

---

## Phase 1 Core Entities

The first shared model should support these entities clearly:

### Organization Layer

- `organizations`
- `sites`
- `farms`
- `hatcheries`

### Identity Layer

- `user_profiles`
- `memberships`
- `roles`

### Operations Layer

- `batches`
- `operational_records`
- `record_templates`
- `record_entries`

### Device Layer

- `devices`
- `device_bindings`
- `telemetry_events`
- `device_status_snapshots`

### Alert Layer

- `alerts`
- `alert_events`
- `alert_rules`

### Optional Phase 1.5 Entities

- `tanks`
- `ponds`
- `zones`

These are recommended if current UX already needs location-level context.

---

## Minimum Data Relationships

The following relationships must be true in the first implementation:

- one organization can own many farms
- one farm can contain many hatcheries or operating areas
- one user can belong to many farms through memberships
- one device is bound to one farm context at a time
- telemetry belongs to a device and must remain time-ordered
- operational records belong to a farm context and a user
- alerts belong to a farm and usually also a device or rule source

Avoid a model that assumes:

- one user only ever has one farm
- one product equals one customer type
- records exist without farm context
- telemetry exists without device identity

---

## Required Screens For Phase 1

### Public / Entry

- landing page
- solutions page
- packages page
- request demo page
- login

### Authenticated Product

- dashboard home
- farm switcher or farm-scoped dashboard
- device list
- device detail
- records list
- create record
- edit record
- alerts list
- alert detail or slide-over
- onboarding / first profile setup
- settings basics

### Screen Quality Rules

Every screen must have:

- loading state
- empty state
- error state
- permission-denied state where applicable

No blank screens.

---

## Phase 1 Primary User Flows

### Flow A: Operator Daily Record

1. user selects farm / hatchery context
2. user opens daily record form
3. user enters structured operational data
4. record is saved and appears in record history
5. dashboard summary can reflect the latest record context

### Flow B: Monitoring Review

1. user lands on dashboard
2. user sees device status summary
3. user opens a device
4. user checks latest values and history
5. user identifies abnormal state or follows up on alert

### Flow C: Alert Handling

1. telemetry or state change triggers alert
2. alert appears in UI
3. user opens alert
4. user acknowledges or resolves
5. alert history remains visible

### Flow D: Admin Setup

1. admin adds user to organization or farm
2. admin assigns role
3. device is visible only in the correct farm scope
4. operator works within assigned context

---

## Recommended Build Order

### Step 1. Foundation

- auth
- user profile
- memberships
- farm scoping

### Step 2. Data Model

- operational records tables
- devices tables
- telemetry tables
- alerts tables

### Step 3. Product Surfaces

- dashboard home
- device list and detail
- records list and create flow
- alerts list

### Step 4. Integration

- real telemetry ingest
- latest device status
- alert generation path

### Step 5. Harden

- permissions
- empty / error states
- audit-sensitive actions
- export basics if needed

---

## Phase 1 Backlog Buckets

### Bucket A. Auth And Tenant Foundation

- finalize org / farm membership flow
- complete role enforcement in UI and backend
- lock farm-scoped navigation

### Bucket B. Operational Records

- define record template model
- build create/edit/view flows
- add record history per farm

### Bucket C. Devices And Monitoring

- device registry UI
- device detail page
- latest telemetry widgets
- historical chart path

### Bucket D. Alerts

- implement alert rules baseline
- create alert list and state model
- support acknowledge / resolve actions

### Bucket E. UX Hardening

- explicit empty states
- responsive operator UI
- localization consistency
- navigation cleanup

---

## Definition Of Done For Phase 1

Phase 1 is done when all of the following are true:

- a real user can sign in and enter a farm-scoped workspace
- a user can create and review structured operational records
- a user can see real device status and latest telemetry
- alerts can be triggered and handled through the UI
- basic permissions prevent cross-farm leakage
- the product is usable for real field monitoring and daily operations

If automation is still missing, Phase 1 can still be complete.

That is expected.

---

## What Starts In Phase 2

After Phase 1 is stable, Phase 2 should begin with:

- rule-based automation
- actuator control model
- process calculation logic
- multi-step automation workflows
- deeper research and enterprise variants

Phase 2 should reuse the same data and UX foundation created here.

---

## Practical Next Step

The next implementation decision should not be another broad planning discussion.

The next step should be one of these:

1. lock the Phase 1 database entities in concrete schema terms
2. lock the Phase 1 screen inventory into implementation tickets
3. start building the first missing Phase 1 flow, beginning with either:
   - operational records
   - device monitoring
   - alerts

Recommended first product feature:

`Operational records` first, then `device monitoring`, then `alerts`.

