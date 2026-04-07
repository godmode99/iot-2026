---
id: SB-00-FRONTEND-APP-PLAN
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-UX-FLOW, SB-00-AUTH-ROLE-SPEC, SB-00-FULLSTACK-PRODUCTION-PLAN, EX-09-DASHBOARD-MVP-SPEC, EX-11-PROVISIONING-SPEC]
source_of_truth: true
last_updated: 2026-04-06
language: English-first
audience: ai
---

# SB-00 Frontend App Plan v1.0

## Purpose

This file defines the production frontend direction for SB-00.

Use it to answer:

- which frontend framework to use
- how route groups should be organized
- how mobile, desktop, i18n, and roles should work
- what the MVP dashboard must evolve into before pilot
- what remains out of scope

## Scope

This file covers:

- Next.js production frontend architecture
- mobile-first customer experience with desktop support
- multilingual UI: Thai, English, Myanmar
- customer self-service monitoring
- role-specific navigation for `admin/operator`, `customer/farm_owner`, `reseller`, and `farm_member`
- design-system and responsive rules

It does not cover:

- backend schema details
- firmware behavior
- billing UI
- native mobile app
- BLE provisioning

## Source Of Truth Rules

- This file is authoritative for frontend production direction.
- `SB-00_UX_Flow_v1_0.md` remains authoritative for screen-level user flows.
- `SB-00_Auth_Role_Spec_v1_0.md` remains authoritative for role and permission semantics.
- `SB-00_Fullstack_Production_Plan_v1_0.md` remains authoritative for backend/frontend implementation sequencing.
- If this file conflicts with a closed decision, the decision register wins.

## Locked Frontend Decisions

| Area | Decision |
| --- | --- |
| Production framework | Next.js |
| Primary device | Mobile-first |
| Desktop | Must be supported |
| Customer dashboard | Customers must be able to log in and monitor their own farm/device data |
| Languages | Thai (`th`), English (`en`), Myanmar (`my`) |
| Pilot roles | `admin/operator`, `customer/farm_owner`, `reseller`, `farm_member` |
| Customer provisioning | QR + Web/PWA only |
| Public auth | OAuth-only via Google, Facebook, and Apple |
| Native app | Not in baseline |

## Architecture Direction

Use a Next.js App Router structure when migrating from the current Node server-rendered dashboard.

Recommended route groups:

```text
app/
  (public)/
    login/
    signup/
  (onboarding)/
    onboarding/
    farms/new/
    provision/
  (customer)/
    dashboard/
    farms/[farmId]/
    devices/[deviceId]/
    alerts/
  (operator)/
    ops/
    admin/
    support/
    ota/
  (reseller)/
    reseller/farms/
    reseller/farms/[farmId]/
  (account)/
    settings/
    language/
```

## Data Fetching Rules

- Use server-side data fetching for protected dashboard pages by default.
- Never expose service-role Supabase keys to the browser.
- Use route handlers or backend APIs for admin/operator actions.
- Use user JWT scope for customer/reseller/farm-member reads.
- Use explicit loading, empty, and error states for every data surface.

## Auth And Route Guard

All protected routes must require a valid authenticated session.

Public routes:

- `/login`
- `/signup`

Public auth pages must use Google, Facebook, and Apple OAuth buttons only. Email/password registration and password reset are not in production v1.

Protected routes:

- all customer routes
- all operator routes
- all reseller routes
- `/provision`
- farm management
- alert management
- command and OTA actions

Route guard behavior:

```text
request protected URL
  -> check session
  -> no session -> redirect to /login?returnUrl=...
  -> session exists -> complete first-login /onboarding if needed
  -> load role + farm scope
  -> unauthorized -> show 403 or redirect to allowed landing page
  -> authorized -> render route
```

## Role-Specific Navigation

| Role | Landing | Main nav |
| --- | --- | --- |
| `admin/operator` | `/ops` | Ops, Devices, Alerts, Commands, OTA, Support, Settings |
| `customer/farm_owner` | `/dashboard` | Dashboard, Devices, Alerts, Provision, Farm Settings, Support |
| `reseller` | `/reseller/farms` | Managed Farms, Alerts, Support |
| `farm_member` | `/dashboard` | Dashboard and actions allowed by permission flags |

Permission-sensitive UI must hide actions the user cannot perform, but backend/RLS must remain the source of enforcement.

## Customer Dashboard Requirements

The customer dashboard must be simpler than the operator view.

Required mobile-first sections:

- farm status summary
- device status cards
- latest sensor values
- open alerts
- map or last-known location
- battery and runtime status
- recent history chart
- support/contact CTA

Desktop view may use a split layout, but mobile must remain the primary design target.

## Operator Dashboard Requirements

Operator screens may expose more technical controls:

- fleet overview
- open alert management
- command queue
- OTA checks/apply commands
- notification contact management
- recent command log
- support/incident context

High-risk actions must require confirmation:

- `reboot`
- `ota_apply`
- destructive farm actions
- future batch commands

## Provisioning Requirements

Provisioning is mobile-first.

Required flow:

```text
scan QR
  -> /provision?qr=...
  -> login if needed
  -> resolve device
  -> choose or create farm
  -> optional device nickname / install label
  -> bind
  -> success
  -> link to dashboard
```

Required states:

- loading
- valid unbound
- already bound
- invalid QR
- unauthorized
- success
- no QR/manual paste fallback

## Farm Management Requirements

Required screens:

- `/farms/new`
- `/farms/[farmId]`

Required features:

- create farm
- edit farm name
- view devices in farm
- edit notification contacts
- add device CTA to `/provision`
- farm selector if user has more than one farm

Deferred until after pilot:

- ownership transfer
- destructive delete flow, unless explicitly needed
- member invitation UI, unless pilot requires it

## Internationalization

Supported locales:

- `th` Thai
- `en` English
- `my` Myanmar

Rules:

- Do not hardcode user-facing strings inside components.
- Use translation keys from the first production frontend implementation.
- Store selected language in a cookie or persisted user preference.
- Format dates and numbers by locale.
- Default locale should be Thai unless business decision changes.

Suggested translation namespaces:

```text
common
auth
dashboard
devices
alerts
provisioning
farms
ops
ota
support
errors
```

## Design System Direction

The production frontend should introduce reusable components:

- `MetricCard`
- `DeviceCard`
- `StatusPill`
- `AlertCard`
- `CommandPanel`
- `MapPanel`
- `HistoryChart`
- `LanguageSwitcher`
- `RoleAwareNav`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `ConfirmDialog`

Visual rules:

- mobile-first layouts
- strong status readability
- clear alert severity hierarchy
- avoid blank screens
- touch targets large enough for field use
- support Thai and Myanmar text expansion

## Migration From Current MVP

Current state:

- `dashboard/src/server.mjs` contains server-rendered MVP pages.
- `/ops`, `/devices`, `/devices/:id`, and `/provision` exist.
- frontend is not yet Next.js.
- auth is still not a full Supabase user session flow.

Migration steps:

1. Create a real Next.js app under `dashboard/`.
2. Preserve existing backend API paths.
3. Move `/ops`, `/devices`, `/devices/:id`, and `/provision` into Next.js routes.
4. Add OAuth-only `/login`, `/signup`, `/onboarding`, `/farms/new`, and `/farms/[farmId]`.
5. Add i18n infrastructure before visual polish.
6. Add role-aware navigation and route guards.
7. Replace config actor fallback with authenticated user session.

## Implementation Priority

| Priority | Work |
| --- | --- |
| P0 | Next.js scaffold, auth guard, login/signup, customer dashboard shell |
| P0 | i18n baseline for Thai/English/Myanmar |
| P0 | mobile-first provisioning flow |
| P0 | farm creation and first-device onboarding |
| P1 | customer device detail, alerts, and notification contact settings |
| P1 | operator ops page parity with current MVP |
| P1 | OTA confirm dialog and command safety UI |
| P2 | reseller dashboard and managed farm list |
| P2 | farm member permission-aware UI |
| P2 | map overview, turbidity/battery charts, responsive polish |

## Acceptance Criteria

- A frontend implementation agent can start the Next.js migration without guessing architecture.
- The customer can log in and monitor their farm/device data.
- The UI supports Thai, English, and Myanmar.
- Role-specific navigation is explicit.
- Mobile provisioning and customer dashboard are first-class requirements.
- The current MVP dashboard is treated as a source to migrate, not the final frontend architecture.

## Open Questions

- Whether to use locale-prefixed routes (`/th/dashboard`) or cookie-based locale without route prefix.
- Whether customer and operator dashboards should share components but use different layouts.
- Whether farm member invitation UI must ship during pilot or only the permission model.
- Which visual design direction and brand system should be used for production.

## Related Docs

- [SB-00_UX_Flow_v1_0.md](./SB-00_UX_Flow_v1_0.md)
- [SB-00_Auth_Role_Spec_v1_0.md](./SB-00_Auth_Role_Spec_v1_0.md)
- [SB-00_Fullstack_Production_Plan_v1_0.md](./SB-00_Fullstack_Production_Plan_v1_0.md)
- [EX-09_DASHBOARD_MVP_SPEC_v1_0.md](./EX-09_DASHBOARD_MVP_SPEC_v1_0.md)
- [EX-11_PROVISIONING_SPEC_v1_0.md](./EX-11_PROVISIONING_SPEC_v1_0.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
