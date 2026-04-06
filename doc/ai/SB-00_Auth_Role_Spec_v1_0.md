---
id: SB-00-AUTH-ROLE-SPEC
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, SB-00-BACKEND-SECURITY, EX-06-SCHEMA-SPEC]
source_of_truth: true
last_updated: 2026-04-06
language: English-first
audience: ai
---

# SB-00 Auth and Role Spec v1.0

## Purpose

This file defines the authentication model, user types, permission system, and database schema for access control in the SB-00 system.

Use it to answer:

- what user types exist and what each can access
- what tables are required for role and membership management
- how RLS policies should be structured
- what to implement per phase vs defer

## Scope

This file covers:

- Supabase Auth integration
- user type model (`super_admin`, `reseller`, `customer`, farm member)
- farm membership and granular permission flags
- reseller portfolio model
- RLS policy patterns for each table
- phased rollout plan

It does not cover:

- frontend login/signup UI (see `SB-00_UX_Flow_v1_0.md`)
- notification preferences per user (deferred to post-pilot)
- billing tier enforcement (deferred to Phase 3)

## Source Of Truth Rules

- This file is authoritative for auth model, role definitions, and RLS policy patterns.
- D-07 in the decision register is the locked baseline for this spec.
- If a permission requirement changes, update D-07 and this file before changing code.
- The phased rollout table defines what is in scope per phase — do not implement Phase 2 or 3 items during Phase 1.

## Dependencies

- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md) — D-07
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)

---

## Core Content

### User Types

| Type | Description | Count at pilot |
| --- | --- | --- |
| `super_admin` | Full system access, bypasses RLS, assigned by Pon manually | 2–3 (Pon, team) |
| `reseller` | Sees and supports only farms in their portfolio | 0 at pilot, Phase 3 |
| `customer` | Farm owner, full control of their own farm(s) | 3–10 at pilot |
| _(farm member)_ | No global type — invited to a farm with specific permissions | Phase 2 |

All users share a single Supabase Auth pool. User type is stored in `user_profiles.user_type`.

---

### Schema

#### user_profiles

Stores the global type for each authenticated user.

```sql
create table public.user_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  user_type  text not null default 'customer'
    check (user_type in ('super_admin', 'reseller', 'customer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

A row in `user_profiles` is created automatically on sign-up via a Supabase trigger. Default type is `customer`. `super_admin` and `reseller` are assigned manually by Pon in the Supabase dashboard.

#### farm_members _(Phase 2)_

Allows a farm owner to invite other users into their farm with granular permissions.

```sql
create table public.farm_members (
  id                   uuid primary key default gen_random_uuid(),
  farm_id              uuid not null references public.farms(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  can_view             boolean not null default true,
  can_receive_alerts   boolean not null default true,
  can_manage_alerts    boolean not null default false,
  can_send_commands    boolean not null default false,
  invited_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default timezone('utc', now()),
  unique (farm_id, user_id)
);
```

Permission flags controlled by the farm owner:

| Flag | Allows |
| --- | --- |
| `can_view` | view dashboard, device data, telemetry, map, chart |
| `can_receive_alerts` | receive LINE and email notifications |
| `can_manage_alerts` | acknowledge, suppress, resolve alerts |
| `can_send_commands` | queue device commands including reboot and OTA |

#### reseller_farms _(Phase 3)_

Maps which farms a reseller manages.

```sql
create table public.reseller_farms (
  id                 uuid primary key default gen_random_uuid(),
  reseller_user_id   uuid not null references auth.users(id) on delete cascade,
  farm_id            uuid not null references public.farms(id) on delete cascade,
  assigned_by        uuid references auth.users(id) on delete set null,
  assigned_at        timestamptz not null default timezone('utc', now()),
  unique (reseller_user_id, farm_id)
);
```

---

### Helper Functions

```sql
-- returns true if the current user is a super_admin
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid()
      and user_type = 'super_admin'
  );
$$;

-- returns true if the current user is a reseller who manages the given farm
create or replace function public.reseller_manages_farm(target_farm_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reseller_farms
    where farm_id = target_farm_id
      and reseller_user_id = auth.uid()
  );
$$;

-- returns true if the current user is a member of the farm with can_view
create or replace function public.member_can_view(target_farm_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = target_farm_id
      and user_id = auth.uid()
      and can_view = true
  );
$$;
```

---

### RLS Policy Patterns

Each protected table should follow this 4-path pattern. Apply at Phase 1 with only the paths that are currently in scope, and uncomment reseller/member paths in later phases.

#### Pattern: SELECT access

```sql
-- Phase 1: super_admin + owner only
-- Phase 2: + farm_members
-- Phase 3: + reseller

using (
  public.is_super_admin()
  or (owner path: farms.owner_user_id = auth.uid())
  -- Phase 2: or public.member_can_view(farm_id)
  -- Phase 3: or public.reseller_manages_farm(farm_id)
)
```

#### Pattern: WRITE access (commands, alert management)

Check the specific permission flag rather than blanket write access.

```sql
-- for alert management actions
using (
  public.is_super_admin()
  or (farm owner check)
  -- Phase 2: or (member with can_manage_alerts = true)
)
```

---

### Access Matrix

| Resource | super_admin | reseller | customer (owner) | member |
| --- | --- | --- | --- | --- |
| All farms (list) | ✅ | ❌ | ❌ | ❌ |
| Own / managed farms | ✅ | ✅ (Phase 3) | ✅ | ✅ (Phase 2) |
| Device data / telemetry | ✅ | ✅ read-only | ✅ | `can_view` |
| Alerts (view) | ✅ | ✅ read-only | ✅ | `can_view` |
| Alerts (receive notifications) | ✅ | ❌ | ✅ | `can_receive_alerts` |
| Alerts (manage) | ✅ | ❌ | ✅ | `can_manage_alerts` |
| Device commands / OTA | ✅ | ❌ | ✅ | `can_send_commands` |
| Farm settings (edit/delete) | ✅ | ❌ | ✅ | ❌ |
| Invite farm members | ✅ | ❌ | ✅ | ❌ |
| Assign reseller to farm | ✅ | ❌ | ❌ | ❌ |

---

### Auth Flow Summary

```
user visits protected URL
  → auth guard checks Supabase JWT session
  → no session → redirect to /login?returnUrl=...
  → valid session → load user_profiles.user_type
  → super_admin → use service key, bypass RLS
  → reseller / customer / member → use user JWT, RLS enforces scope
```

`super_admin` access is enforced in the backend layer by checking `user_profiles.user_type` and switching to the Supabase service key for queries. This must not be exposed to the frontend.

---

### Sign-up Trigger

A Supabase database trigger creates a `user_profiles` row automatically on new user creation:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, user_type)
  values (new.id, 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

### Phased Rollout

| Phase | Implement | Defer |
| --- | --- | --- |
| Phase 1 (pilot) | `user_profiles` table + trigger, `is_super_admin()` helper, RLS with super_admin + owner paths, login/signup UI, auth guard on all routes | `farm_members`, `reseller_farms`, member permission UI |
| Phase 2 (pre-launch) | `farm_members` table, member invite UI, per-member permission editor, RLS member paths | `reseller_farms`, reseller portal |
| Phase 3 (commercial) | `reseller_farms` table, reseller portal UI, RLS reseller paths, assign reseller to farm (admin UI) | — |

---

### What Needs to Change from Current Implementation

| Item | Current state | Required change |
| --- | --- | --- |
| Auth | hardcoded `actor_user_id` query param | integrate Supabase Auth JWT on all routes |
| user_profiles table | does not exist | create + trigger on sign-up |
| RLS policies | owner-only (`owner_user_id = auth.uid()`) | add `is_super_admin()` path to all policies |
| Backend auth check | `INGEST_ALLOW_INSECURE_DEV=true` | use JWT verification in production mode |
| Dashboard routes | no auth guard | add session check, redirect to /login if missing |
| Provisioning | `actor_user_id` from query param | resolve from authenticated session |

---

## Acceptance Criteria

- An implementation agent can read this file and implement the Phase 1 auth system without ambiguity.
- All four user types and their access boundaries are explicit.
- The phased rollout table makes clear what is in scope for each phase.
- RLS policy patterns are copy-paste ready for each protected table.

## Open Questions

- Whether `reseller` should also be able to receive alert notifications for farms in their portfolio (deferred to Phase 3 design).
- Whether farm member invitation should use an email-based invite link or a direct user lookup.
- Whether a farm owner can transfer farm ownership to another user.

## Related Docs

- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md) — D-07
- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
