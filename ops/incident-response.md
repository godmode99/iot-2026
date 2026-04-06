# Incident Response Playbook

## Purpose

This playbook defines the first production-oriented response flow for SB-00 device, backend, dashboard, alert, notification, and OTA incidents.

## Severity Levels

| Severity | Meaning | Target Response |
| --- | --- | --- |
| `sev1` | Many devices or customer-visible dashboard/API outage | Start triage immediately |
| `sev2` | One farm or critical device path degraded | Triage within the same working session |
| `sev3` | Non-critical alert, UI issue, or single-device maintenance case | Queue for normal support handling |

## First 10 Minutes

1. Identify the affected scope: device, farm, backend, dashboard, broker, notification, or OTA.
2. Check `/ops` for open alerts and recent command history.
3. Check backend health at `/health`.
4. Check local or deployment logs for request ids and structured ingest events.
5. Confirm whether the issue is active, stale, or already recovered.
6. Record the incident in the team tracker before applying risky changes.

## Device Offline Triage

1. Check `device_status.last_seen_at` and `online_state`.
2. Compare expected publish interval with offline threshold.
3. Check recent `command_log` entries for reboot, config refresh, OTA, or telemetry flush.
4. If a command was sent, confirm whether the device fetched it and acknowledged it.
5. If no new telemetry arrives, wait for field hardware access before marking as hardware failure.

## Ingest Or API Triage

1. Check backend `/health`.
2. Confirm `INGEST_SHARED_TOKEN` is set in non-local environments.
3. Search logs by `x-request-id` or backend-generated `requestId`.
4. Confirm `device_id` is known and not retired.
5. Check `telemetry` duplicates before assuming data loss.

## Notification Triage

1. Check `notification_log` for the alert id.
2. Confirm recipient source in payload: `farm` or `env`.
3. Confirm `NOTIFICATION_MODE`.
4. For email, verify `RESEND_API_KEY` and farm or env email recipient.
5. For LINE, verify `LINE_CHANNEL_ACCESS_TOKEN` and farm or env LINE user id.

## OTA Triage

1. Check `/api/ota/manifest` response for the target device.
2. Confirm the release channel and `OTA_RELEASES_PATH`.
3. Confirm manifest checksum, artifact URL, and rollout state.
4. Do not widen rollout after a failed OTA until rollback criteria are reviewed.

## Escalation

- Escalate to firmware when the device is unreachable after backend, broker, and command-log checks.
- Escalate to hardware when power/runtime, antenna, water ingress, or enclosure evidence is involved.
- Escalate to backend when ingest, dashboard, auth, alert, provisioning, notification, or OTA manifest behavior is inconsistent.

## Closure Criteria

- Root cause or likely cause is recorded.
- Customer-visible status is restored or workaround is documented.
- Any config or code change is linked to the incident.
- Follow-up tasks are created for permanent fixes.
