---
id: NEXTJS-MIGRATION-PLAN
type: implementation_plan
status: active
owners: [Pon]
depends_on: [SB-00-FRONTEND-APP-PLAN, SB-00-FULLSTACK-PRODUCTION-PLAN, SB-00-AUTH-ROLE-SPEC, SB-00-UX-FLOW]
source_of_truth: true
last_updated: 2026-04-06
language: English-first
audience: ai
---

# Next.js Migration Plan v1.0

## Purpose

This file defines the practical migration plan from the current `dashboard` Node MVP into a production Next.js frontend.

Use it to answer:

- how to scaffold the Next.js app without losing current MVP behavior
- what to implement first
- which packages and route groups to use
- how auth, i18n, and role-aware navigation should be introduced
- what counts as done for the first migration phase

## Scope

This file covers:

- dashboard migration strategy
- Next.js app structure
- Supabase Auth frontend integration sequence
- i18n baseline for Thai, English, and Myanmar
- customer/operator/reseller route groups
- incremental migration from existing MVP pages

It does not cover:

- firmware validation
- production deployment setup
- billing
- native mobile app
- final visual brand system

## Source Of Truth Rules

- `SB-00_Frontend_App_Plan_v1_0.md` remains authoritative for frontend product direction.
- `SB-00_Fullstack_Production_Plan_v1_0.md` remains authoritative for backend/frontend sequencing.
- This file is authoritative for the first implementation sequence of the Next.js migration.
- If implementation reveals a conflict, update this plan before continuing the migration.

## Current State

Current dashboard:

- path: `dashboard/`
- runtime: plain Node server in `dashboard/src/server.mjs`
- scripts: `node --watch src/server.mjs`
- routes: `/devices`, `/devices/:id`, `/provision`, `/ops`
- auth: backend internal token and configured actor id
- status: useful MVP, not production frontend architecture

Backend now has:

- RBAC/RLS foundation
- admin API layer for member invites, reseller assignment, notification preferences, and audit log
- provisioning, alerts, commands, OTA manifest, and notification baseline

## Migration Strategy

Use in-place migration under `dashboard/`.

Reason:

- repo already treats `dashboard/` as the frontend app
- avoids maintaining two dashboard apps
- current MVP is small enough to port route-by-route

Safety rule:

- keep `dashboard/src/server.mjs` temporarily as `dashboard/src/legacy-server.mjs` during migration if needed
- do not delete legacy MVP routes until equivalent Next.js routes exist
- preserve backend API contracts while frontend changes

## Package Direction

Use:

- `next`
- `react`
- `react-dom`
- `@supabase/ssr`
- `@supabase/supabase-js`

Use simple CSS modules or global CSS in the first pass.

Do not add a heavy component library yet.

Reason:

- first pass should prove auth/session/route structure
- design system can follow once product screens are stable

## Environment Variables

Dashboard needs:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
BACKEND_URL
ADMIN_API_TOKEN
NEXT_PUBLIC_DEFAULT_LOCALE=th
```

Rules:

- service-role keys must never be exposed to browser code
- `ADMIN_API_TOKEN` may only be used in server-only route handlers or server actions
- public Supabase values must use `NEXT_PUBLIC_`
- customer data should come from user JWT/RLS path once available

## Target App Structure

Start with:

```text
dashboard/
  app/
    layout.tsx
    globals.css
    page.tsx
    (public)/
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
    (customer)/
      dashboard/page.tsx
      devices/[deviceId]/page.tsx
      alerts/page.tsx
      farms/[farmId]/page.tsx
    (onboarding)/
      provision/page.tsx
      farms/new/page.tsx
    (operator)/
      ops/page.tsx
    (reseller)/
      reseller/farms/page.tsx
    settings/language/page.tsx
  lib/
    backend.ts
    i18n.ts
    supabase/
      server.ts
      client.ts
    auth/
      guards.ts
      roles.ts
  components/
    navigation/
    ui/
    dashboard/
    devices/
    alerts/
    provisioning/
  messages/
    th.json
    en.json
    my.json
```

## Route Priority

### P0

- `/login`
- `/signup`
- `/dashboard`
- `/provision`
- `/devices/[deviceId]`
- `/ops`

### P1

- `/farms/new`
- `/farms/[farmId]`
- `/alerts`
- `/settings/language`

### P2

- `/reseller/farms`
- `/support`
- OTA status/detail pages

## Phase Plan

### Phase 0: Scaffold

Goal:

- convert `dashboard/` into a bootable Next.js app

Tasks:

- update `dashboard/package.json`
- add `app/layout.tsx`, `app/page.tsx`, and `app/globals.css`
- add basic `lib/backend.ts`
- keep legacy server file only if needed for reference

Acceptance:

- `pnpm --dir dashboard dev` starts Next.js
- `/` renders
- no browser-facing secret is introduced

### Phase 1: Auth Shell

Goal:

- establish Supabase Auth session baseline

Tasks:

- add Supabase server/client helpers
- add `/login`
- add `/signup`
- add `/forgot-password`
- add logout action
- add simple `getCurrentUser()` helper
- add route guard helper

Acceptance:

- unauthenticated user is redirected from protected routes
- login/signup pages render
- session helper is server-safe

### Phase 2: i18n Shell

Goal:

- prevent hardcoded UI text from becoming technical debt

Tasks:

- add `messages/th.json`
- add `messages/en.json`
- add `messages/my.json`
- add `lib/i18n.ts`
- add language switcher placeholder
- default locale: `th`

Acceptance:

- all new route titles and nav labels come from translation keys
- selected language can be stored in cookie or profile later

### Phase 3: Customer Dashboard

Goal:

- customer can monitor farm/device data from mobile-first dashboard

Tasks:

- add `/dashboard`
- fetch device/fleet summary from backend or RLS-safe API
- add status cards
- add device list
- add open alert preview
- add responsive layout

Acceptance:

- customer dashboard renders usable data from existing backend endpoints or stubbed typed loaders
- mobile layout is primary
- empty/error/loading states exist

### Phase 4: Provisioning

Goal:

- port QR + Web/PWA provisioning into Next.js

Tasks:

- add `/provision`
- parse `qr` query param
- call backend provisioning resolve
- require auth before bind
- choose/create farm path
- bind device
- success state links to dashboard/device

Acceptance:

- provisioning flow no longer asks for actor id in UI
- invalid/already-bound/unauthorized/success states exist

### Phase 5: Farm Settings

Goal:

- expose production RBAC features through owner/operator UI

Tasks:

- add `/farms/[farmId]`
- show members
- create member invite
- show reseller assignments
- update notification preferences
- show recent audit log

Acceptance:

- owner/operator can manage farm-level settings through backend API
- member invite returns token only once and UI copy explains that
- reseller permissions are explicit

### Phase 6: Ops Parity

Goal:

- port current `/ops` MVP to Next.js

Tasks:

- show fleet overview
- show open alerts
- show recent commands
- allow alert actions
- allow safe command queue
- expose OTA check/apply with confirm dialog

Acceptance:

- current MVP ops functionality exists in Next.js
- high-risk actions require confirmation

## Backend Contract Needs

Frontend migration can begin now, but these backend contracts should be added/confirmed during migration:

- `/api/me`
- `/api/farms`
- `/api/farms/:farmId/devices`
- `/api/farms/:farmId/members`
- `/api/farms/:farmId/invites`
- `/api/farms/:farmId/notification-preferences`
- `/api/reseller/farms`

Temporary admin routes may be used for operator screens only.

Customer-facing routes should move toward Supabase Auth user JWT and RLS.

## Do Not Do Yet

- Do not add native mobile app.
- Do not add BLE provisioning.
- Do not add billing UI.
- Do not introduce a large UI framework before the first Next.js route shell is stable.
- Do not expose service-role keys to browser code.
- Do not keep actor id override in production UI.

## First Implementation Ticket

Recommended next task:

`FE-01 Next.js Scaffold And Auth Shell`

Scope:

- replace dashboard runtime with Next.js app
- add base app layout
- add Supabase helper files
- add `/login` and `/signup` placeholders
- add translation message files
- keep backend API unchanged

Definition of done:

- `pnpm --dir dashboard dev` runs Next.js
- `/`, `/login`, `/signup`, `/dashboard` render
- protected `/dashboard` has an auth guard placeholder
- no service role secret is exposed
- current backend tests remain passing

## Verification

Run:

```powershell
pnpm --dir dashboard dev
pnpm test:backend
pnpm db:smoke:rbac
```

Once browser automation is added:

```powershell
pnpm --dir dashboard test:e2e
```

## Acceptance Criteria

- Implementation agents know whether to replace or fork the dashboard app.
- Next.js package and route direction are explicit.
- Auth/i18n/customer dashboard order is clear.
- Legacy MVP migration rules are explicit.
- First implementation ticket is concrete enough to start coding.

## Related Docs

- [SB-00_Frontend_App_Plan_v1_0.md](./SB-00_Frontend_App_Plan_v1_0.md)
- [SB-00_Fullstack_Production_Plan_v1_0.md](./SB-00_Fullstack_Production_Plan_v1_0.md)
- [SB-00_Auth_Role_Spec_v1_0.md](./SB-00_Auth_Role_Spec_v1_0.md)
- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)
