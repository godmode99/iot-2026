import { getDb } from "../db.mjs";

export async function openOrRefreshAlert(device, alertType, severity, details, status = "open") {
  const sql = getDb();
  const existing = await sql`
    select id
    from public.alerts
    where device_id = ${device.id}
      and alert_type = ${alertType}
      and status in ('open', 'acknowledged')
    limit 1
  `;

  if (existing.length > 0) {
    const rows = await sql`
      update public.alerts
      set
        severity = ${severity},
        details_json = ${sql.json(details)}::jsonb,
        status = ${status}
      where id = ${existing[0].id}
      returning id, alert_type, status, severity, opened_at, resolved_at
    `;
    return {
      action: "refreshed",
      alert: rows[0]
    };
  }

  const rows = await sql`
    insert into public.alerts (
      device_id,
      farm_id,
      alert_type,
      status,
      severity,
      details_json
    ) values (
      ${device.id},
      ${device.farm_id},
      ${alertType},
      ${status},
      ${severity},
      ${sql.json(details)}::jsonb
    )
    returning id, alert_type, status, severity, opened_at, resolved_at
  `;

  return {
    action: "opened",
    alert: rows[0]
  };
}

export async function resolveAlert(deviceId, alertType, details = {}) {
  const sql = getDb();
  const rows = await sql`
    update public.alerts
    set
      status = 'resolved',
      resolved_at = timezone('utc', now()),
      details_json = ${sql.json(details)}::jsonb
    where device_id = ${deviceId}
      and alert_type = ${alertType}
      and status in ('open', 'acknowledged')
    returning id, alert_type, status, severity, opened_at, resolved_at
  `;

  return rows[0] ?? null;
}

export async function listAlerts(status = "open") {
  const sql = getDb();
  return sql`
    select
      a.id,
      a.alert_type,
      a.status,
      a.severity,
      a.opened_at,
      a.resolved_at,
      a.details_json,
      d.device_id,
      d.serial_number
    from public.alerts a
    join public.devices d
      on d.id = a.device_id
    where ${status === "all"} or a.status = ${status}
    order by
      case when a.status = 'open' then 0 else 1 end,
      a.opened_at desc
  `;
}

export async function listAlertsByDevice(deviceId, status = "all") {
  const sql = getDb();
  return sql`
    select
      a.id,
      a.alert_type,
      a.status,
      a.severity,
      a.opened_at,
      a.resolved_at,
      a.details_json
    from public.alerts a
    join public.devices d
      on d.id = a.device_id
    where d.device_id = ${deviceId}
      and (${status === "all"} or a.status = ${status})
    order by
      case when a.status = 'open' then 0 else 1 end,
      a.opened_at desc
  `;
}

export async function listOfflineCandidates() {
  const sql = getDb();
  return sql`
    select
      d.id,
      d.device_id,
      d.serial_number,
      d.farm_id,
      d.publish_interval_sec,
      ds.last_seen_at,
      ds.online_state
    from public.devices d
    left join public.device_status ds
      on ds.device_id = d.id
    where d.farm_id is not null
  `;
}

export async function setDeviceOnlineState(deviceId, onlineState) {
  const sql = getDb();
  const rows = await sql`
    update public.device_status
    set online_state = ${onlineState}
    where device_id = ${deviceId}
    returning device_id, online_state, updated_at
  `;

  return rows[0] ?? null;
}
