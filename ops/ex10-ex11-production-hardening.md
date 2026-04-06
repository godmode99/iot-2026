# EX-10 / EX-11 Production Hardening

## Alerts

- Keep `NOTIFICATION_MODE=stub` in local development
- Set `ALERT_NOTIFY_MIN_INTERVAL_SEC` to avoid noisy repeated notifications on refresh paths
- Notification metadata is recorded under `alerts.details_json.notification`
- Severity changes still trigger notification immediately

## Provisioning

- Local development may pass `actor_user_id` directly only when `PROVISIONING_ALLOW_INSECURE_DEV=true`
- Production-like environments should require `x-actor-user-id`
- Trusted `x-actor-user-id` headers should be paired with `ADMIN_API_TOKEN` for internal dashboard-to-backend calls
- Keep `DASHBOARD_ALLOW_ACTOR_OVERRIDE=false` outside local debugging
- Binding rejects retired devices
- Binding preserves `active` devices as `active` instead of downgrading them to `bound`

## Next Steps

- Replace `x-actor-user-id` with real session auth or signed gateway identity
- Add admin UI or API workflow for editing farm-scoped notification contacts
- Add UI on top of the new admin alert action APIs
- Add provisioning rate limits and abuse logging

## Admin Alert Endpoints

- `POST /api/admin/alerts/:alertId/acknowledge`
- `POST /api/admin/alerts/:alertId/suppress`
- `POST /api/admin/alerts/:alertId/resolve`

## Notification Modes

- `NOTIFICATION_MODE=stub`
- `NOTIFICATION_MODE=resend`
- `NOTIFICATION_MODE=line`

All modes write delivery attempts into `notification_log`.
