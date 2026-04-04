---
id: EX-11-PROVISIONING-SPEC
type: spec
status: ready
owners: [Pon]
depends_on: [EX-06-SCHEMA-SPEC, EX-07-INGEST-SPEC, SB-00-BACKEND-SECURITY, SB-00-DECISIONS]
source_of_truth: true
last_updated: 2026-04-04
language: English-first
audience: ai
---

# EX-11 QR And Web PWA Provisioning Spec v1.0

## Purpose

This file defines the only customer-facing provisioning flow allowed in MVP and pilot.

Use it to answer:

- what the provisioning flow must do
- what states and records must be updated
- what is explicitly out of scope

## Scope

`EX-11` covers:

- QR scan entry
- web or PWA-based provisioning page
- device registration or binding
- farm association
- provisioning state update

It does not cover:

- BLE provisioning
- native mobile app flows
- internal USB or factory QC tooling

## Source Of Truth Rules

- This file is authoritative for `EX-11`.
- Customer provisioning must remain single-flow: `QR + Web/PWA`.
- Do not introduce BLE or browser-specific branching in customer-facing behavior.

## Dependencies

- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)

## Objective

Provide one simple customer onboarding flow that works consistently across supported mobile browsers by using a QR code and a web/PWA page.

The output must be good enough to unlock:

- pilot onboarding
- `EX-23`
- `EX-24`

## Required Customer Flow

The provisioning flow should be:

1. user scans device QR code
2. web/PWA page opens
3. user signs in or is identified through the existing application flow
4. device is registered or bound to a farm/account
5. provisioning state is updated
6. success state confirms the device is now linked

## Required Inputs

The flow must be able to resolve at least:

- `device_id` or equivalent QR payload identity
- target farm or account context

Optional first-pass inputs may include:

- serial number
- install label or nickname

## Required Data Effects

Provisioning must update at least:

- `devices.farm_id`
- `devices.provisioning_state`
- provisioning timestamp or equivalent audit field if present

It may also update:

- device nickname
- install notes

## Required UI States

The first version must support:

- valid unbound device
- already bound device
- invalid or unknown QR
- unauthorized user
- successful bind

Each state should be explicit and readable.

## Security Baseline

- customer must not gain access to other farms or devices
- binding must respect authenticated farm scope
- provisioning actions should be auditable
- service-only or internal device actions must remain out of customer flow

## Explicit Exclusions

These are out of scope for MVP and pilot customer flow:

- BLE provisioning
- native app setup
- per-browser branching logic
- internal USB or factory QC tools

## Suggested Internal Modules

| Module | Responsibility |
| --- | --- |
| `provisioning/qr-parser` | decode QR payload and resolve device identity |
| `provisioning/service` | validate device state and farm ownership |
| `provisioning/repository` | bind device and update provisioning state |
| `provisioning/ui` | show binding states and success/failure messages |

## Non-Goals

- advanced install wizard
- device Wi-Fi provisioning
- BLE-assisted pairing
- factory-floor tooling

## Definition Of Done

`EX-11` is done when all of the following are true:

1. QR scan can open the provisioning web flow
2. valid device identity resolves in the application
3. customer can bind the device to the correct farm/account
4. provisioning state is updated in the database
5. already-bound and invalid-device states are handled explicitly
6. the flow does not branch into BLE or native app requirements

## Acceptance Criteria

- One customer provisioning path exists and is consistent with the locked baseline.
- The flow updates the device record correctly.
- The customer is not exposed to internal-only setup complexity.

## Open Questions

- Whether QR payload should contain only `device_id` or a signed registration token in the first version.
- Whether device naming should happen during bind or as a separate post-bind step.

## Related Docs

- [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
- [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md)
- [EX-06_SCHEMA_SPEC_v1_0.md](./EX-06_SCHEMA_SPEC_v1_0.md)
- [EX-07_INGEST_SPEC_v1_0.md](./EX-07_INGEST_SPEC_v1_0.md)
