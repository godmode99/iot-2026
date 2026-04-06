import { getDb } from "../db.mjs";

export async function getFarmNotificationTargets(farmId) {
  if (!farmId) {
    return null;
  }

  const sql = getDb();
  const rows = await sql`
    select
      id,
      alert_email_to,
      alert_line_user_id
    from public.farms
    where id = ${farmId}
    limit 1
  `;

  const farm = rows[0] ?? null;
  if (!farm) {
    return null;
  }

  return {
    farmId: farm.id,
    alertEmailTo: farm.alert_email_to ?? null,
    alertLineUserId: farm.alert_line_user_id ?? null
  };
}

export async function insertNotificationLog(entry) {
  const sql = getDb();
  const rows = await sql`
    insert into public.notification_log (
      farm_id,
      device_id,
      alert_id,
      channel,
      event_type,
      delivery_status,
      recipient,
      payload_json,
      sent_at
    ) values (
      ${entry.farmId ?? null},
      ${entry.deviceId ?? null},
      ${entry.alertId ?? null},
      ${entry.channel},
      ${entry.eventType},
      ${entry.deliveryStatus},
      ${entry.recipient ?? null},
      ${sql.json(entry.payload ?? {})}::jsonb,
      ${entry.sentAt ?? null}
    )
    returning id, channel, delivery_status, recipient, sent_at, payload_json
  `;

  return rows[0] ?? null;
}
