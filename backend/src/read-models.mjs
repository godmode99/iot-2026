import { getDb } from "./db.mjs";

export async function listDevicesWithStatus() {
  const sql = getDb();
  return sql`
    select
      d.device_id,
      d.serial_number,
      d.firmware_version,
      d.battery_variant,
      d.battery_profile_version,
      d.usable_capacity_mah,
      ds.last_seen_at,
      ds.online_state,
      ds.battery_percent,
      ds.battery_mv,
      ds.signal_quality,
      ds.gps_fix_state,
      ds.last_lat,
      ds.last_lng,
      latest.temperature_c,
      latest.turbidity_raw,
      latest.recorded_at as latest_recorded_at
    from public.devices d
    left join public.device_status ds
      on ds.device_id = d.id
    left join lateral (
      select
        t.temperature_c,
        t.turbidity_raw,
        t.recorded_at
      from public.telemetry t
      where t.device_id = d.id
      order by t.recorded_at desc
      limit 1
    ) latest on true
    order by d.device_id asc
  `;
}

export async function getDeviceDetail(deviceId) {
  const sql = getDb();
  const rows = await sql`
    select
      d.id,
      d.device_id,
      d.serial_number,
      d.firmware_version,
      d.battery_variant,
      d.battery_profile_version,
      d.usable_capacity_mah,
      d.publish_interval_sec,
      ds.last_seen_at,
      ds.online_state,
      ds.battery_percent,
      ds.battery_mv,
      ds.signal_quality,
      ds.gps_fix_state,
      ds.last_lat,
      ds.last_lng,
      latest.temperature_c,
      latest.turbidity_raw,
      latest.recorded_at as latest_recorded_at
    from public.devices d
    left join public.device_status ds
      on ds.device_id = d.id
    left join lateral (
      select
        t.temperature_c,
        t.turbidity_raw,
        t.recorded_at
      from public.telemetry t
      where t.device_id = d.id
      order by t.recorded_at desc
      limit 1
    ) latest on true
    where d.device_id = ${deviceId}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getDeviceTelemetryHistory(deviceId, hours = 24) {
  const sql = getDb();
  const rows = await sql`
    select
      t.recorded_at,
      t.temperature_c,
      t.turbidity_raw,
      t.battery_percent,
      t.battery_mv,
      t.lat,
      t.lng
    from public.telemetry t
    join public.devices d
      on d.id = t.device_id
    where d.device_id = ${deviceId}
      and t.recorded_at >= timezone('utc', now()) - (${hours}::text || ' hours')::interval
    order by t.recorded_at asc
  `;

  if (rows.length > 0) {
    return rows;
  }

  return sql`
    select
      t.recorded_at,
      t.temperature_c,
      t.turbidity_raw,
      t.battery_percent,
      t.battery_mv,
      t.lat,
      t.lng
    from public.telemetry t
    join public.devices d
      on d.id = t.device_id
    where d.device_id = ${deviceId}
    order by t.recorded_at desc
    limit 24
  `;
}

export async function listAlertSummaries(status = "open") {
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
    where (${status === "all"} or a.status = ${status})
    order by
      case when a.status = 'open' then 0 else 1 end,
      a.opened_at desc
  `;
}

export async function getDeviceAlerts(deviceId, status = "all") {
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
