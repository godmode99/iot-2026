---
id: SB-00-AUTH-ROLE-SPEC
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-BACKEND-SECURITY, EX-06-SCHEMA-SPEC, SB-00-FULLSTACK-PRODUCTION-PLAN]
source_of_truth: true
last_updated: 2026-04-06
language: English-first
audience: ai
---

# SB-00 Auth and Role Spec v1.0

## Purpose

This file defines the production authentication, role, membership, reseller, and permission model for SB-00.

Use it to answer:

- what user types exist and what each can access
- what tables are required for role and membership management
- how RLS policies should be structured
- what must be implemented in the production auth/RBAC pass

## Scope

This file covers:

- Supabase Auth integration
- `super_admin`, `operator`, `reseller`, `customer`, and farm member access
- multi-farm customer ownership
- farm member email invite baseline
- reseller portfolio scope
- notification ownership and preference boundaries
- RLS policy patterns

It does not cover:

- frontend route layout (see `SB-00_Frontend_App_Plan_v1_0.md`)
- screen-level UX flow (see `SB-00_UX_Flow_v1_0.md`)
- billing tier enforcement
- enterprise SSO

## Source Of Truth Rules

- This file is authoritative for auth model, role definitions, and RLS policy patterns.
- `SB-00_Fullstack_Production_Plan_v1_0.md` is authoritative for fullstack implementation order.
- If a permission requirement changes, update this file before changing code.
- Farm member and reseller foundations are production baseline, not post-pilot-only concepts.

## Dependencies

- [SB-00_Fullstack_Production_Plan_v1_0.md](./SB-00_Fullstack_Production_Plan_v1_0.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)

## Auth Provider Baseline

Use Supabase Auth for the first production implementation unless a stronger operational reason appears.

Production v1 uses OAuth-only login:

- Google
- Facebook
- Apple

Do not expose email/password signup, password reset, or user-selectable roles in the customer flow. First-login users complete `/onboarding`, which writes `user_profiles.profile_completed_at`.

Reasons:

- Supabase is already the database and RLS platform.
- Supabase user JWTs map directly to RLS.
- It avoids adding another identity provider before hardware validation.
- It is simpler for the team to operate during pilot and early production.

## User Types

| Type | Description | Production baseline |
| --- | --- | --- |
| `super_admin` | Full system access and emergency support authority | yes |
| `operator` | Internal operations user for fleet/support actions | yes |
| `reseller` | Supports only assigned customer farms | yes |
| `customer` | Farm owner, can own multiple farms | yes |
| farm member | Farm-scoped invited user with permission flags | yes |

All users share one Supabase Auth pool.

Global user type lives in `user_profiles.user_type`.

Farm-scoped permissions live in `farm_members`.

Reseller scope lives in `reseller_farms`.

## Required Tables

### user_profiles

Stores global user type for authenticated users.

```sql
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null default 'customer'
    check (user_type in ('super_admin', 'operator', 'reseller', 'customer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

Default sign-up type is `customer`.

`super_admin`, `operator`, and `reseller` are assigned by admin workflow only.

### farm_members

Allows a farm owner to invite users into a farm with explicit permission flags.

```sql
create table public.farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  can_view boolean not null default true,
  can_receive_alerts boolean not null default true,
  can_manage_alerts boolean not null default false,
  can_send_commands boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (farm_id, user_id)
);
```

Default invite:

- `can_view=true`
- `can_receive_alerts=true`
- `can_manage_alerts=false`
- `can_send_commands=false`

### farm_member_invites

Email invite baseline for adding farm members.

```sql
create table public.farm_member_invites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  email text not null,
  invite_token_hash text not null unique,
  permission_json jsonb not null default '{}'::jsonb,
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);
```

Invite requirements:

- single-use
- expires, default 7 days
- tied to invited email
- creates `farm_members` on accept
- writes audit log

### reseller_farms

Scopes reseller access to assigned farms.

```sql
create table public.reseller_farms (
  id uuid primary key default gen_random_uuid(),
  reseller_user_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  can_view boolean not null default true,
  can_manage_alerts boolean not null default false,
  can_send_safe_commands boolean not null default false,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (reseller_user_id, farm_id)
);
```

Default reseller behavior:

- view/support assigned farms only
- no destructive farm actions
- no notification subscription by default
- command sending requires explicit permission
- every action must be auditable

### notification_preferences

Per-user notification preferences inside farm scope.

```sql
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  line_enabled boolean not null default false,
  critical_only boolean not null default false,
  alert_types text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (farm_id, user_id)
);
```

Notification ownership:

- farm owner controls farm-level notification settings
- farm members manage their own preferences within granted permissions
- admin/operator may assist with audit
- reseller receives alerts only when explicitly granted

### audit_log

Immutable production action log.

```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null,
  farm_id uuid references public.farms(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
```

Audit required for:

- member invite/create/update/remove
- reseller assignment/update/remove
- provisioning bind
- notification setting changes
- alert acknowledge/suppress/resolve
- command queue and OTA actions
- admin/operator support actions

## Permission Rules

### Customer / Farm Owner

Can:

- own multiple farms
- create farms
- manage own farms
- bind devices
- manage farm notification fallback contacts
- invite farm members
- acknowledge/suppress/resolve own farm alerts
- send allowed commands

### Farm Member

Can:

- view farm data when `can_view=true`
- receive alerts when `can_receive_alerts=true`
- manage alerts when `can_manage_alerts=true`
- send allowed commands when `can_send_commands=true`

Cannot:

- edit farm ownership
- invite members unless a future permission is added
- change other users' notification preferences

### Reseller

Can:

- view assigned farms
- assist customer support for assigned farms
- manage alerts only if explicitly allowed
- send safe commands only if explicitly allowed

Cannot by default:

- receive notifications
- transfer ownership
- delete farms
- perform bulk OTA
- view unassigned farms

### Admin / Operator

Can:

- view all farms and devices
- assign reseller scope
- assist notification settings
- manage alerts and commands
- use support and incident tools

Must:

- write audit logs for privileged actions
- avoid impersonating customers

## RLS Helper Functions

Required helpers:

- `public.is_super_admin()`
- `public.is_operator()`
- `public.user_owns_farm(target_farm_id uuid)`
- `public.member_can_view(target_farm_id uuid)`
- `public.member_can_manage_alerts(target_farm_id uuid)`
- `public.member_can_send_commands(target_farm_id uuid)`
- `public.reseller_manages_farm(target_farm_id uuid)`
- `public.reseller_can_manage_alerts(target_farm_id uuid)`
- `public.reseller_can_send_safe_commands(target_farm_id uuid)`

## RLS Policy Pattern

Protected read access should follow:

```sql
using (
  public.is_super_admin()
  or public.is_operator()
  or public.user_owns_farm(farm_id)
  or public.member_can_view(farm_id)
  or public.reseller_manages_farm(farm_id)
)
```

Write actions must use action-specific permission helpers instead of broad read access.

## Access Matrix

| Resource | super_admin/operator | reseller | farm owner | farm member |
| --- | --- | --- | --- | --- |
| All farms | yes | no | no | no |
| Assigned/owned farms | yes | assigned only | owned only | member farms only |
| Device telemetry | yes | assigned only | owned only | `can_view` |
| Alert view | yes | assigned only | owned only | `can_view` |
| Alert manage | yes | explicit reseller permission | yes | `can_manage_alerts` |
| Notification settings | yes with audit | no by default | yes | own preferences only |
| Device commands | yes | explicit safe-command permission | yes | `can_send_commands` |
| OTA apply | yes | no by default | owner only with confirm | no by default |
| Invite farm members | yes | no | yes | no |
| Assign reseller | yes | no | optional request only | no |

## Production Rollout

| Phase | Implement | Defer |
| --- | --- | --- |
| Phase 1 | `user_profiles`, `farm_members`, `reseller_farms`, helper functions, RLS foundations, OAuth login/signup, onboarding, auth guard | enterprise SSO |
| Phase 2 | email invites, farm settings permission editor, notification preferences, customer command/alert permissions | billing tier enforcement |
| Phase 3 | reseller portal, support views, reseller assignment UI, fine-grained reseller permissions | bulk OTA |

## Current Implementation Gap

| Item | Current state | Required change |
| --- | --- | --- |
| Auth | Supabase Auth session in dashboard; OAuth providers require dashboard setup | Google/Facebook/Apple enabled and tested in Supabase Auth |
| user profiles | not implemented | create table and sign-up trigger |
| farm members | not implemented | create table and invite lifecycle |
| reseller scope | not implemented | create `reseller_farms` and helper policies |
| notification preferences | farm fallback only | per-user preferences and routing |
| audit | partial command/audit fields | central `audit_log` |
| frontend guard | config actor fallback | authenticated route guard |

## Acceptance Criteria

- Production roles and their access boundaries are explicit.
- Farm member invite baseline is email invite link.
- Reseller support access is scoped and audited.
- Customer command and alert permissions are explicit.
- Notification ownership is controlled by farm owner with member preferences.
- RLS policy patterns are actionable for implementation.

## Open Questions

- Whether reseller command permission should exist at pilot or remain view/support-only.
- Whether farm owner can invite members before first device is bound.
- Whether invite acceptance requires email verification before membership creation.
- Whether notification preferences need per-alert-type granularity at pilot or `critical_only` is enough.

## Related Docs

- [SB-00_Fullstack_Production_Plan_v1_0.md](./SB-00_Fullstack_Production_Plan_v1_0.md)
- [SB-00_Frontend_App_Plan_v1_0.md](./SB-00_Frontend_App_Plan_v1_0.md)
- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
