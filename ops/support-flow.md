# Support Flow

## Purpose

This document defines the first support workflow for pilot and pre-production operations.

## Support Intake

Every support case should capture:

- Farm name
- Device id or serial number
- Customer contact
- Reported symptom
- First observed time
- Screenshots or field notes when available
- Whether the issue blocks operations

## Support Categories

| Category | Examples | First Owner |
| --- | --- | --- |
| Device offline | No telemetry, stale dashboard, weak signal | Backend first, then firmware/hardware |
| Sensor issue | Missing temperature, missing GPS, invalid turbidity | Firmware first |
| Battery issue | Runtime shorter than expected, low battery alert | Hardware plus firmware |
| Provisioning issue | QR invalid, bind rejected, wrong farm | Backend |
| Notification issue | LINE/email missing or duplicated | Backend |
| Dashboard issue | Wrong status, filter issue, map/chart issue | Backend/dashboard |

## Standard Flow

1. Open `/ops`.
2. Search the device or farm.
3. Check open alerts and recent commands.
4. Check whether notification recipients are farm-scoped or using env fallback.
5. If the issue is dashboard-only, verify backend API responses.
6. If the issue is device-side, queue `config_refresh` or `telemetry_flush` only when safe.
7. Record the action and outcome in the support case.

## Safe Commands

| Command | When To Use | Risk |
| --- | --- | --- |
| `config_refresh` | Device config may be stale | Low |
| `telemetry_flush` | Buffered payloads may exist | Low |
| `ota_check` | Verify whether update exists | Low |
| `reboot` | Device appears stuck but still polling commands | Medium |
| `ota_apply` | Planned rollout only | High |

## Customer Message Template

```text
We are checking device <device_id> for <farm_name>.
Current status: <online/offline/stale>.
Last seen: <timestamp>.
Next action: <action>.
We will update you after the next telemetry window or field check.
```

## Handoff Criteria

Handoff to firmware/hardware when:

- Backend receives no command fetch or telemetry after the expected window.
- Sensor values are consistently missing after config refresh.
- Battery/runtime evidence requires measurement.
- Field photos or enclosure evidence suggest physical damage.

Handoff to backend when:

- API response differs from dashboard display.
- Alerts are not opening, resolving, or notifying correctly.
- Provisioning rejects valid QR/device state.
- Notification routing or audit logs are missing.
