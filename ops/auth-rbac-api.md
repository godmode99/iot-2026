# Auth/RBAC API Notes

This note tracks the first backend API surface for production auth and role work.

Current status:

- API routes are protected by the existing admin backend gate: `Authorization: Bearer ${ADMIN_API_TOKEN}`.
- User-facing Next.js routes should later call these through a Supabase Auth session/JWT layer.
- Farm/reseller/member scope is enforced at the database layer through RLS helpers and local smoke tests.

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/farms/:farmId/members` | `GET` | List farm owner/member rows |
| `/api/admin/farms/:farmId/invites` | `POST` | Create single-use farm member invite |
| `/api/admin/farm-invites/accept` | `POST` | Accept invite token into `farm_members` |
| `/api/admin/farms/:farmId/resellers` | `GET` | List reseller assignments for a farm |
| `/api/admin/farms/:farmId/resellers` | `POST` | Assign or update reseller farm scope |
| `/api/admin/farms/:farmId/notification-preferences` | `GET` | List per-user notification preferences |
| `/api/admin/farms/:farmId/notification-preferences/:userId` | `PATCH` | Update per-user notification preference |
| `/api/admin/audit-log` | `GET` | List recent audit actions, optionally by `farm_id` |

## Invite Baseline

- Invite token is returned only once from the create route.
- Backend stores `invite_token_hash`, not the raw token.
- Default permissions remain safe: view and receive alerts only.
- Accepting an invite writes `farm_member_invite.accepted` to `audit_log`.

## Reseller Baseline

- Reseller access must be assigned through `public.reseller_farms`.
- Do not infer reseller access from email domain or customer naming.
- `can_send_safe_commands` never grants `ota_apply`.
- Reseller actions must be auditable.

## Verification

Run after migrations or policy changes:

```powershell
pnpm db:reset
pnpm db:lint
pnpm db:smoke:rbac
pnpm test:backend
```
