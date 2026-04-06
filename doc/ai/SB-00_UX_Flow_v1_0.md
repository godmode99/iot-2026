---
id: SB-00-UX-FLOW
type: spec
status: active
owners: [Pon]
depends_on: [SB-00-MASTER, SB-00-DECISIONS, EX-09-DASHBOARD-MVP-SPEC, EX-11-PROVISIONING-SPEC, EX-10-ALERTS-SPEC, SB-00-BACKEND-SECURITY]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# SB-00 UX Flow v1.0

## Purpose

This file defines the user-facing flows for all screens and interactions in the SB-00 system.

Use it to answer:

- what screens exist and what URL each maps to
- what each screen must show and allow the user to do
- what the user flow is between screens
- what states each screen must handle explicitly
- what is already implemented vs what needs to be built

## Scope

This file covers:

- Dashboard (Ops Overview, Main Dashboard, Device Detail)
- Provisioning (QR + Web/PWA customer onboarding)
- Alert and notification UI
- Login and auth flow
- First-time user and empty states
- Farm management
- OTA update flow

It does not cover:

- Firmware-level OTA implementation (see `SB-00_Firmware_Hardware_v1_1.md`)
- Backend API implementation (see `SB-00_Backend_Security_v1_1.md`)
- Visual design system, colors, or typography
- Mobile app (not in baseline)

For frontend production architecture, i18n, route groups, and component migration direction, see `SB-00_Frontend_App_Plan_v1_0.md`.

## Source Of Truth Rules

- This file is authoritative for screen inventory, user flows, and UX state requirements.
- If a flow conflicts with a closed decision, the decision register takes precedence.
- If a screen's data requirement conflicts with the schema spec, the schema spec takes precedence.
- Implementation agents must read this file before building any frontend screen.

## Dependencies

- [AI_DOC_STANDARD.md](./AI_DOC_STANDARD.md)
- [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [EX-09_DASHBOARD_MVP_SPEC_v1_0.md](./EX-09_DASHBOARD_MVP_SPEC_v1_0.md)
- [EX-10_ALERTS_SPEC_v1_0.md](./EX-10_ALERTS_SPEC_v1_0.md)
- [EX-11_PROVISIONING_SPEC_v1_0.md](./EX-11_PROVISIONING_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [SB-00_Frontend_App_Plan_v1_0.md](./SB-00_Frontend_App_Plan_v1_0.md)
- [SB-00_Fullstack_Production_Plan_v1_0.md](./SB-00_Fullstack_Production_Plan_v1_0.md)

---

## Core Content

### Screen Inventory

| Screen ID | Name | URL | Status | Primary User |
| --- | --- | --- | --- | --- |
| SCR-01 | Login | `/login` | needs build | all users |
| SCR-02 | Sign Up | `/signup` | needs build | new customers |
| SCR-03 | Create Farm | `/farms/new` | needs build | new users |
| SCR-04 | Ops Overview | `/ops` | exists in code | operator |
| SCR-05 | Main Dashboard | `/devices` | exists in code | operator |
| SCR-06 | Device Detail Panel | `/devices/:id` | exists in code | operator |
| SCR-07 | Provisioning | `/provision` | exists in code | customer / operator |
| SCR-08 | Farm Settings | `/farms/:id` | needs build | farm owner |

Production frontend target:

- migrate current MVP into Next.js
- support mobile-first customer monitoring
- support desktop dashboard use
- support Thai, English, and Myanmar
- support `admin/operator`, `customer/farm_owner`, `reseller`, and `farm_member` from the start

---

### Flow 1: Login and Auth

**Users:** all users (operator and customer)
**Auth system:** Supabase Auth (JWT session)
**Rule:** all routes except `/login` and `/signup` require a valid session

#### Login Flow

```
user visits any protected URL
  → auth guard checks JWT session
  → no valid session → redirect to /login?returnUrl=...
  → user submits email + password
  → Supabase Auth validates credentials
  → success → check if user has at least one farm
      → has farm  → redirect to /ops (or returnUrl)
      → no farm   → redirect to /farms/new
  → failure → show error message, stay on /login
```

#### Logout Flow

```
user clicks logout (any screen)
  → call Supabase signOut
  → clear JWT session
  → redirect to /login
```

#### SCR-01 Login — Required Elements

- email input
- password input
- sign in button
- link to `/signup`
- error state: "Invalid email or password"
- redirect to returnUrl after success

#### SCR-02 Sign Up — Required Elements

- email input
- password input
- confirm password input
- sign up button
- error states: email already exists, passwords do not match
- after sign up: Supabase sends confirmation email
- after email confirm: redirect to `/farms/new`

#### Auth Guard Rules

- every route except `/login` and `/signup` must check for a valid JWT session
- `/provision` also requires auth — binding a device requires a known user identity
- expired JWT must trigger silent refresh or redirect to `/login`
- RLS in Supabase ensures users can only query their own farm data regardless of frontend routing

#### Open Auth Decision

- it is not yet decided whether operator accounts and customer accounts are separate user types or the same Supabase user with different farm ownership
- current dev mode uses a hardcoded `actor_user_id` query param — this must be replaced before pilot

---

### Flow 2: First-time User and Empty States

**Users:** new customers after sign up

#### New User Journey

```
sign up complete + email confirmed
  → redirect to /farms/new
  → user creates first farm (name required)
  → redirect to /devices (Main Dashboard)
  → dashboard shows empty state: no devices
  → user follows CTA to /provision
  → user scans QR and binds first device
  → device appears in dashboard after first telemetry
```

#### SCR-03 Create Farm — Required Elements

- farm name input (required)
- create button
- `owner_user_id` is set automatically to `auth.uid()`
- after create: redirect to `/devices`

#### Empty State Requirements

Every screen must render an explicit empty state. Blank screens are not acceptable.

| Screen | Empty condition | Required message | Required CTA |
| --- | --- | --- | --- |
| SCR-04 Ops Overview | no devices | "No devices available yet." | link to `/provision` |
| SCR-05 Main Dashboard | no devices in farm | "No devices matched the current filters." | link to `/provision` |
| SCR-06 Device Detail | no GPS | "No GPS fix available for this device yet." | none |
| SCR-06 Device Detail | no telemetry history | "No temperature history available." | none |
| SCR-06 Device Detail | no alerts | "No alerts in this view." | none |
| SCR-06 Device Detail | no commands | "No command activity yet." | none |
| Alert Center | no open alerts | explicit no-alert message | none |

---

### Flow 3: Dashboard (Operator)

**Users:** operator and farm owner
**Device:** desktop-first, split-view layout

#### Navigation Structure

```
/ops (Ops Overview)  ──→  /devices (Main Dashboard)
                     ──→  /provision (Provisioning)

/devices             ──→  /devices/:id (Device Detail, split view)
/devices/:id         ──→  actions: send command, manage alert
```

#### SCR-04 Ops Overview — Required Elements

- summary cards: total devices, online count, needs-attention count, critical alert count
- open alerts list (all devices, all farms)
- recent command log
- fleet snapshot: up to 12 devices with name, status pill, battery %, last seen
- navigation links to `/devices` and `/provision`

#### SCR-05 Main Dashboard — Required Elements

- summary bar: online count, needs-attention count, critical alert count
- search input: filter by device name or serial number
- state filter: all / online / stale / offline
- device list: name, serial, status pill, temperature, battery %, last seen
- open alerts badge count on sidebar
- click on device row → open Device Detail panel on the right (split view, URL becomes `/devices/:id`)

#### SCR-06 Device Detail Panel — Required Elements

- header: device name or serial, device_id, battery variant label, firmware version, status pill
- metrics cards: temperature (°C), turbidity (raw), battery (% and mV), last seen + GPS fix state
- map: OpenStreetMap iframe with marker at last known GPS position
- temperature chart: SVG line chart, 24-hour history from real telemetry
- device alerts section: list with acknowledge / suppress / resolve buttons per alert
- device commands section: command type dropdown, optional note, queue button, command log

#### Device Command Types

| Command | Effect |
| --- | --- |
| `reboot` | device reboots immediately |
| `config_refresh` | device reloads config from NVS or backend |
| `ota_check` | device queries OTA manifest for available updates |
| `ota_apply` | device downloads and applies new firmware |
| `telemetry_flush` | device flushes any buffered telemetry |

#### Status Pill Values

| Value | Meaning | Visual treatment |
| --- | --- | --- |
| `online` | fresh telemetry received within window | green |
| `stale` | telemetry received but older than expected | amber |
| `offline` | no telemetry for longer than offline threshold | red |
| `unknown` | no telemetry received yet | gray |

---

### Flow 4: Provisioning (Customer Onboarding)

**Users:** customer (farm owner), also accessible by operator for testing
**Device:** mobile-first (customer scans QR on physical device with phone)
**Rule:** QR + Web/PWA is the only customer provisioning path — do not introduce BLE or native app branching

#### Customer Provisioning Flow

```
customer scans QR code on physical buoy device
  → browser opens /provision?qr=<payload>
  → auth guard: not logged in → redirect to /login, then back to /provision
  → provisioning page resolves device from QR payload
  → backend checks device state:
      → valid_unbound   → show Confirm and Bind form
      → already_bound   → show error: device already assigned to a farm
      → invalid         → show error: QR not recognised
      → unauthorized    → show error: user does not own the target farm
  → customer selects farm, optionally sets device nickname, confirms
  → POST /provision/bind
  → success → show success state, device is now bound
  → device appears in dashboard after first telemetry
```

#### SCR-07 Provisioning — Required UI States

| State | Trigger | Required message |
| --- | --- | --- |
| `loading` | QR param present, resolving | loading indicator |
| `valid_unbound` | device found and unbound | show device info, bind form |
| `already_bound` | device already has a farm | show existing farm name, suggest contacting admin |
| `invalid` | QR payload not recognised | "QR not recognised or device not found" |
| `unauthorized` | user does not own the farm in QR | "You do not have access to this farm" |
| `success` | bind completed | confirm device name and farm, optional link to dashboard |
| `no_qr` | page loaded without QR param | show manual QR paste input as fallback |

#### Provisioning Data Effects

On a successful bind the following must be updated:

- `devices.farm_id` set to the target farm
- `devices.provisioning_state` updated to `bound`
- provisioning timestamp recorded in `details_json` or equivalent audit field

#### Open Provisioning Decisions

- QR payload format is not yet locked — options are plain `device_id` or a signed registration token
- device nickname input is not yet in the bind form — currently only farm binding is implemented
- Supabase Auth integration is still `actor_user_id` from query param in dev mode

---

### Flow 5: Alert and Notification

**Users:** system (auto-triggered), operator (manages alerts)

#### Alert Lifecycle

```
telemetry ingest event
  → evaluate conditions: threshold, offline, low battery, sensor fault
  → check for existing open alert of same type for same device (dedup)
      → no existing alert → create new alert record, send notification
      → existing alert open → suppressed, no duplicate created
  → alert visible on SCR-04 Ops Overview and SCR-06 Device Detail
  → operator sees alert, chooses action:
      → acknowledge → mark alert as acknowledged, alert remains open
      → suppress    → stop notifications temporarily, alert remains open
      → resolve     → close alert, set resolved_at timestamp
  → condition returns to normal → auto-resolve, set resolved_at
```

#### Alert Types

| Type | Trigger condition | Auto-resolve condition | Default severity |
| --- | --- | --- | --- |
| `threshold` | sensor value outside configured range | value returns to safe range | `warning` or `critical` |
| `offline` | `last_seen_at` exceeds freshness window | telemetry resumes | `critical` |
| `low_battery` | battery % below `low_battery_warn_pct` or `low_battery_critical_pct` | battery % recovers | `warning` or `critical` |
| `sensor_fault` | sensor error flag or invalid reading from ingest | valid reading resumes | `warning` |

#### Alert Status Values

| Status | Meaning |
| --- | --- |
| `open` | condition active, not yet acknowledged |
| `acknowledged` | operator has seen it, condition still active |
| `suppressed` | notifications paused, condition still active |
| `resolved` | condition cleared, either manually or automatically |

#### Notification Channels (MVP)

| Channel | Status | Notes |
| --- | --- | --- |
| LINE | pilot (free tier) | send on alert open, include severity and device name |
| email | stub | structured but not wired, wire before commercial launch |
| web / in-app | implemented | alert badge count on dashboard, list on Ops and Device Detail |

Rate limiting: `ALERT_NOTIFY_MIN_INTERVAL_SEC` prevents notification flood on the same alert.

---

### Flow 6: Farm Management

**Users:** farm owner (customer)

#### Farm Flow

```
user opens /farms/:id from Ops Overview or Settings
  → view farm name, farm ID, device count
  → edit farm name inline or via form → PATCH /farms/:id
  → view device list with provisioning_state per device
  → click "Add device" → go to /provision
  → click "Delete farm" → show confirmation dialog
      → user types farm name to confirm
      → DELETE /farms/:id → cascade: device.farm_id set to NULL, alerts and telemetry cascade-deleted
```

#### SCR-08 Farm Settings — Required Elements

- farm name (editable)
- farm ID (read-only)
- active device count and total device count
- device list with `provisioning_state` label per device
- "Add device" button → link to `/provision`
- "Delete farm" button → destructive, requires typed confirmation

#### Device Provisioning States

| State | Meaning |
| --- | --- |
| `inventory` | device exists in system, not yet bound to any farm |
| `registered` | QR resolved, pending bind confirmation |
| `bound` | device assigned to a farm |
| `active` | device has sent telemetry at least once |
| `retired` | device decommissioned |

#### Open Farm Decisions

- maximum farms per user is not defined in schema — pilot may limit to one farm per user
- farm selector UI (to switch between multiple farms) is not yet designed
- farm settings screen does not yet exist in code

---

### Flow 7: OTA Update

**Users:** operator (initiates), system (device-side execution)

#### OTA Operator Flow

```
operator opens Device Detail → Commands panel
  → select command_type = ota_check, add optional note, click Queue
  → backend queues command, command_log status = queued
  → device receives ota_check via MQTT
  → device calls GET /api/ota/manifest?device_id=...&current_version=...&battery_variant=...
  → manifest returns latest release for the device's channel and battery_variant
      → no newer version → command succeeds with no-update result
      → newer version found → operator sees available version in command log
  → operator selects ota_apply, adds note, confirms (confirmation dialog required)
  → backend queues ota_apply command
  → device downloads firmware binary, applies, reboots
  → device sends ack → command_log status updated to succeeded or failed
  → on success: devices.firmware_version updated
  → on failure: device rolls back to previous firmware automatically
```

#### OTA Manifest Selection Rules

The backend selects the correct release by:

1. matching `channel` if specified
2. matching `battery_variants` list if present in the release record
3. selecting only releases with version higher than `current_version`
4. picking the highest matching version

#### OTA UX Safety Requirements

- `ota_apply` command must show a confirmation dialog before queuing — device will reboot
- dialog must show current firmware version and target firmware version
- during OTA, device will briefly appear offline — dashboard must not trigger a new offline alert during this window (grace period needed)
- if OTA fails, firmware rollback is automatic on the device side
- all OTA actions must be logged with `requested_by` user ID in `command_log`

#### Command Log Status Values

| Status | Meaning |
| --- | --- |
| `queued` | command created, not yet picked up by device |
| `sent` | backend forwarded command to device via MQTT |
| `succeeded` | device acknowledged success |
| `failed` | device reported error or command timed out |
| `cancelled` | operator cancelled before device picked up |

#### Open OTA Decisions

- OTA progress is currently tracked only through `command_log` status polling — real-time progress requires polling interval or WebSocket upgrade
- batch OTA (`/api/ota/push/batch`) is a service-only route with no operator UI yet
- offline alert suppression during OTA grace period is not yet implemented
- release catalog is currently loaded from a JSON file — production should use a database or blob storage

---

## What Exists vs What Needs to Be Built

### Exists in Code

| Item | Location |
| --- | --- |
| Ops Overview page | `dashboard/src/server.mjs` — `renderOpsPage` |
| Main Dashboard + Device Detail | `dashboard/src/server.mjs` — `renderPage` |
| Provisioning page + bind flow | `dashboard/src/server.mjs` — `renderProvisioningPage` |
| Alert list + ack/suppress/resolve UI | `dashboard/src/server.mjs` — `renderManagedAlerts` |
| Command panel + command log | `dashboard/src/server.mjs` — device commands section |
| OTA manifest API | `backend/src/ota/service.mjs` |
| Alert evaluation + dedup | `backend/src/alerts/service.mjs` |
| Provisioning QR parser + bind | `backend/src/provisioning/` |
| Supabase schema + RLS | `supabase/migrations/` |

### Needs to Be Built

| Item | Priority | Blocking |
| --- | --- | --- |
| Login page (`/login`) | P0 | all authenticated flows |
| Sign up page (`/signup`) | P0 | new customer onboarding |
| Create farm page (`/farms/new`) | P0 | first-time user flow |
| Auth guard on all routes | P0 | security baseline |
| Supabase Auth integration (replace hardcoded actor_user_id) | P0 | pilot readiness |
| Farm settings page (`/farms/:id`) | P1 | farm management |
| OTA confirm dialog before ota_apply | P1 | OTA safety |
| Offline alert grace period during OTA | P1 | OTA UX correctness |
| Turbidity chart (currently only temperature) | P2 | dashboard completeness |
| Map overview (all devices on one map) | P2 | dashboard completeness |
| Mobile-responsive layout for dashboard | P2 | customer usability |
| Batch OTA operator UI | P3 | post-pilot |

---

## Acceptance Criteria

- An implementation agent can read this file and identify every screen, its URL, its required elements, and its required states.
- The "exists vs needs to be built" table is accurate and complete.
- Every user-facing flow has explicit empty states and error states listed.
- Locked provisioning and auth decisions are visible in this file.

## Open Questions

- Whether operator accounts and customer farm-owner accounts are the same Supabase user type or separate.
- Whether farm selector UI is needed if pilot customers each have exactly one farm.
- Whether OTA progress tracking should use polling or a WebSocket upgrade.
- Whether the dashboard needs a separate mobile-optimized view or responsive layout is sufficient.
- Whether QR payload should be a plain `device_id` or a signed short-lived token.

## Related Docs

- [AI_START_HERE.md](./AI_START_HERE.md)
- [EX-09_DASHBOARD_MVP_SPEC_v1_0.md](./EX-09_DASHBOARD_MVP_SPEC_v1_0.md)
- [EX-10_ALERTS_SPEC_v1_0.md](./EX-10_ALERTS_SPEC_v1_0.md)
- [EX-11_PROVISIONING_SPEC_v1_0.md](./EX-11_PROVISIONING_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [doc/ux-user-flow-v1.html](../ux-user-flow-v1.html)
