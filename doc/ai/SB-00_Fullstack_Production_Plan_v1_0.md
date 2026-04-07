---
id: SB-00-FULLSTACK-PRODUCTION-PLAN
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-FRONTEND-APP-PLAN, SB-00-AUTH-ROLE-SPEC, SB-00-UX-FLOW, SB-00-BACKEND-SECURITY]
source_of_truth: true
last_updated: 2026-04-06
language: English-first
audience: ai
---

# SB-00 Fullstack Production Plan v1.0

## Purpose

This file defines the coordinated frontend and backend production plan for SB-00.

Use it to answer:

- what backend work is required before frontend can be production-ready
- what frontend screens map to which backend APIs and schemas
- how auth, roles, farm membership, reseller scope, commands, alerts, and notifications should work end-to-end
- what to implement before waiting for physical device validation

## Scope

This file covers:

- production-ready auth direction
- multi-farm, multi-device, multi-role behavior
- farm member invitation strategy
- reseller support scope
- customer command and alert permissions
- notification ownership and preferences
- frontend and backend implementation order

It does not cover:

- firmware hardware validation
- PCB/enclosure production
- billing/payment
- native mobile app

## Source Of Truth Rules

- This file is authoritative for coordinating frontend and backend production work.
- `SB-00_Auth_Role_Spec_v1_0.md` remains authoritative for role semantics and RLS patterns.
- `SB-00_Frontend_App_Plan_v1_0.md` remains authoritative for frontend architecture.
- `SB-00_UX_Flow_v1_0.md` remains authoritative for screen flows and UI states.
- If this file conflicts with a closed decision, the decision register wins.

## Locked Product Decisions

| Area | Decision |
| --- | --- |
| Auth provider | Supabase Auth with OAuth-only Google, Facebook, and Apple for production v1 |
| Farm model | one customer can own multiple farms |
| Device model | one farm can have multiple devices |
| Pilot roles | `admin/operator`, `customer/farm_owner`, `reseller`, `farm_member` |
| Customer dashboard | customer can log in and monitor farm/device data directly |
| Customer commands | customer can send allowed device commands |
| Customer alert management | customer can acknowledge, resolve, and suppress alerts |
| Member onboarding | email invite link baseline |
| Notification ownership | farm owner controls farm notification settings |
| Member notification preferences | farm members can manage their own preferences within owner-granted permissions |
| Reseller scope | reseller can assist assigned farms only, with audit and permission limits |

## Auth Provider Decision

Use Supabase Auth for the first production implementation.

Production v1 login is OAuth-only:

- Google
- Facebook
- Apple

Do not expose email/password signup or password reset in the customer flow unless the auth decision is reopened.

Reasons:

- Supabase is already the database and RLS platform.
- User JWT can map directly to RLS policies.
- It avoids adding a second identity provider during pilot.
- Operational burden is lower than introducing Clerk/Auth0 at this stage.
- OAuth-only login reduces password reset, weak password, and credential stuffing support burden.

Revisit only if:

- reseller/customer enterprise SSO becomes mandatory
- Supabase Auth limitations block production requirements
- identity audit/compliance needs outgrow Supabase Auth

## Required Backend Schema

### Phase A Tables

Must be added before production frontend migration is considered complete:

- `user_profiles`
- `farm_members`
- `farm_member_invites`
- `reseller_farms`
- `notification_preferences`
- `audit_log`

### Table Responsibilities

| Table | Purpose |
| --- | --- |
| `user_profiles` | global user type: `super_admin`, `operator`, `reseller`, `customer` |
| `farm_members` | farm-level membership and permission flags |
| `farm_member_invites` | email-based member invite lifecycle |
| `reseller_farms` | reseller-to-farm scoped support access |
| `notification_preferences` | per-user notification channel and alert-type preference |
| `audit_log` | immutable record of privileged customer/admin/reseller actions |

## Role And Permission Model

### Admin / Operator

Can:

- view all farms/devices
- support all customers
- manage alerts
- send commands
- manage OTA
- assist notification settings
- assign reseller scope

Must:

- write audit logs for privileged actions
- avoid using customer identity directly

### Customer / Farm Owner

Can:

- create multiple farms
- manage own farms
- bind devices through QR + Web/PWA
- invite farm members
- set farm notification fallback contacts
- manage alerts
- send allowed commands

Cannot:

- view other farms
- assign reseller without admin-controlled policy if reseller flow requires approval

### Farm Member

Can act only within assigned farms and permission flags:

- `can_view`
- `can_receive_alerts`
- `can_manage_alerts`
- `can_send_commands`

Default invite should be safe:

- `can_view=true`
- `can_receive_alerts=true`
- `can_manage_alerts=false`
- `can_send_commands=false`

### Reseller

Can:

- view assigned farms
- help triage alerts and devices
- assist provisioning support if explicitly allowed
- recommend support actions

Default restrictions:

- no automatic notification subscription
- no destructive farm actions
- no ownership transfer
- no bulk OTA by default
- command sending requires explicit permission or admin approval

Every reseller action must be auditable.

## Farm Member Invite Flow

Recommended baseline: email invite link.

Flow:

```text
farm owner enters member email
  -> selects permission flags
  -> backend creates farm_member_invites row
  -> system emails invite link
  -> recipient opens link
  -> if no account: sign up
  -> if account exists: sign in
  -> accept invite
  -> backend creates farm_members row
  -> member appears in farm settings
```

Why this baseline:

- easy for customer
- secure because invite token can expire
- works for people without existing accounts
- auditable
- avoids manual admin work

Invite token requirements:

- single-use
- expires, suggested default: 7 days
- stores invited email
- stores invited_by user id
- stores permission snapshot
- cannot be accepted by a different email unless admin override is explicitly implemented

## Notification Ownership

Production baseline:

- farm owner controls farm-level notification settings
- farm members control their own notification preferences
- admin/operator can assist with audit
- reseller only receives notifications if explicitly granted by farm owner or admin policy

Routing order:

1. user-level notification preferences for eligible farm members and owner
2. farm-level fallback contacts
3. environment fallback only for local/staging safety

Required preferences:

| Setting | Meaning |
| --- | --- |
| `email_enabled` | user receives email alerts |
| `line_enabled` | user receives LINE alerts |
| `critical_only` | user receives only critical alerts |
| `alert_types` | optional list of alert types to receive |

## Customer Commands

Customers may send commands, but risk must be controlled.

| Command | Customer allowed | Required guard |
| --- | --- | --- |
| `config_refresh` | yes | farm permission `can_send_commands` |
| `telemetry_flush` | yes | farm permission `can_send_commands` |
| `ota_check` | yes | farm permission `can_send_commands` |
| `reboot` | yes | confirm dialog + audit |
| `ota_apply` | yes, owner only by default | confirm dialog + current/target version + audit |

Farm members can send commands only if `can_send_commands=true`.

Reseller command behavior:

- default: view/recommend only
- optional: allow safe commands for assigned farms if admin enables reseller command permission

## Alert Management

Customers can:

- acknowledge alerts
- resolve alerts
- suppress alerts

Rules:

- farm owner can manage all farm alerts
- farm member requires `can_manage_alerts=true`
- reseller requires assigned farm plus explicit manage permission
- admin/operator can manage all alerts
- every action writes audit log

## Screen To API Matrix

| Screen | Backend/API Needs | Role Guard |
| --- | --- | --- |
| `/login` | Supabase Auth sign in | public |
| `/signup` | OAuth account creation + profile trigger | public |
| `/onboarding` | first-login display name and locale completion | authenticated |
| `/farms/new` | create farm, create owner membership | authenticated customer |
| `/dashboard` | customer farm summary API | farm owner/member |
| `/farms/:id` | farm settings, members, notification settings | owner or member permission |
| `/devices/:id` | device detail, telemetry, alerts, commands | farm scoped |
| `/alerts` | farm alert list + actions | farm scoped |
| `/provision` | resolve/bind device | farm owner or operator |
| `/ops` | fleet overview | admin/operator |
| `/reseller/farms` | assigned farm list | reseller |
| `/support` | audit, command, incident context | admin/operator/reseller scoped |

## Backend API Groups

Recommended groups:

```text
/api/auth/session
/api/me
/api/farms
/api/farms/:farmId/members
/api/farms/:farmId/invites
/api/farms/:farmId/notification-settings
/api/farms/:farmId/devices
/api/devices/:deviceId
/api/devices/:deviceId/history
/api/devices/:deviceId/commands
/api/alerts
/api/alerts/:alertId/actions
/api/provisioning/resolve
/api/provisioning/bind
/api/reseller/farms
/api/admin/*
```

## Implementation Phases

### Phase 1: Auth Foundation

Backend:

- add `user_profiles`
- add Supabase Auth profile trigger
- add `farm_members`
- add helper functions for owner/member/reseller/admin checks
- update RLS for owner + member + admin baseline

Frontend:

- add Next.js scaffold
- add OAuth-only `/login`, `/signup`, and `/onboarding`
- add auth guard
- add role-aware landing redirect

### Phase 2: Farm And Customer Dashboard

Backend:

- create farm API
- farm selector API
- customer dashboard summary API
- device list/detail APIs scoped by farm permissions

Frontend:

- `/farms/new`
- `/dashboard`
- customer device list
- customer device detail
- mobile-first layout
- i18n baseline

### Phase 3: Provisioning And Member Invites

Backend:

- authenticated provisioning bind
- farm invite token lifecycle
- accept invite API
- audit bind/invite actions

Frontend:

- mobile `/provision`
- invite member UI
- accept invite UI
- farm settings member list

### Phase 4: Alerts, Commands, Notifications

Backend:

- permissioned alert actions
- permissioned command queue
- notification preferences
- audit log for all actions

Frontend:

- alert center
- alert action UI
- command confirm dialogs
- notification settings

### Phase 5: Reseller And Operator

Backend:

- reseller farm assignment
- reseller-scoped read/support APIs
- operator support APIs

Frontend:

- reseller dashboard
- operator ops dashboard parity
- support context views

### Phase 6: OTA Safety

Backend:

- OTA rollout state
- signing and rollback policy
- audit and grace period controls

Frontend:

- `ota_apply` confirm dialog
- version comparison
- command progress/status
- OTA safety copy

## Definition Of Done

The fullstack production plan is ready for device-only validation when:

- Supabase Auth is implemented
- role and farm membership are enforced in backend and RLS
- Next.js frontend has login/signup, customer dashboard, provisioning, farm settings, alerts, and role-aware navigation
- customer commands and alert actions are permissioned and audited
- notification settings are farm/member aware
- reseller access is scoped and audited
- admin/operator actions use production auth, not dev actor fallback
- all critical API groups have tests

## Open Questions

- Whether reseller command permission should exist at pilot or stay view/support-only.
- Whether farm owner can invite members before first device is bound.
- Whether invite acceptance should require email verification before creating membership.
- Whether notification preferences need per-alert-type granularity at pilot or critical-only is enough.

## Related Docs

- [SB-00_Frontend_App_Plan_v1_0.md](./SB-00_Frontend_App_Plan_v1_0.md)
- [SB-00_Auth_Role_Spec_v1_0.md](./SB-00_Auth_Role_Spec_v1_0.md)
- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
