# Notification Baseline

## Supported Modes

- `stub`
- `resend`
- `line`

## Required Environment

- `NOTIFICATION_MODE`
- `RESEND_API_KEY` with `ALERT_EMAIL_TO` as global fallback for email mode
- `LINE_CHANNEL_ACCESS_TOKEN` with `ALERT_LINE_USER_ID` as global fallback for LINE mode

## Recipient Resolution

Notification recipients now resolve in this order:

1. Farm-scoped contact on `public.farms`
2. Global environment fallback from `.env`

Current farm fields:

- `farms.alert_email_to`
- `farms.alert_line_user_id`

## Admin Workflow

- `GET /api/admin/farms/notification-targets`
- `PATCH /api/admin/farms/:farmId/notification-targets`
- Dashboard ops page exposes the same flow at `/ops`

## Audit Trail

Every attempted notification is stored in `notification_log` with:

- channel
- event type
- delivery status
- recipient
- payload summary
- sent timestamp

## Current Limitation

Recipients are farm-scoped for dispatch, but there is still no authenticated customer-facing self-service UI for editing contacts.
