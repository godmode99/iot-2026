import { getDb } from "../db.mjs";

export async function findDeviceByDeviceId(deviceId) {
  const sql = getDb();
  const rows = await sql`
    select
      id,
      device_id,
      serial_number,
      farm_id,
      publish_interval_sec,
      firmware_version,
      battery_variant,
      battery_profile_version,
      usable_capacity_mah
    from public.devices
    where device_id = ${deviceId}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function persistTelemetryAndStatus(device, telemetry) {
  const sql = getDb();

  return sql.begin(async (trx) => {
    const duplicateRows = await trx`
      select id
      from public.telemetry
      where device_id = ${device.id}
        and recorded_at = ${telemetry.recordedAt}::timestamptz
        and payload_json = ${trx.json(telemetry.rawPayload)}::jsonb
      limit 1
    `;

    let telemetryInserted = false;

    if (duplicateRows.length === 0) {
      await trx`
        insert into public.telemetry (
          device_id,
          recorded_at,
          temperature_c,
          turbidity_raw,
          battery_percent,
          battery_mv,
          lat,
          lng,
          payload_json
        ) values (
          ${device.id},
          ${telemetry.recordedAt}::timestamptz,
          ${telemetry.temperatureC},
          ${telemetry.turbidityRaw},
          ${telemetry.batteryPercent},
          ${telemetry.batteryMv},
          ${telemetry.lat},
          ${telemetry.lng},
          ${trx.json(telemetry.rawPayload)}::jsonb
        )
      `;
      telemetryInserted = true;
    }

    await trx`
      insert into public.device_status (
        device_id,
        last_seen_at,
        online_state,
        battery_percent,
        battery_mv,
        signal_quality,
        gps_fix_state,
        last_lat,
        last_lng
      ) values (
        ${device.id},
        ${telemetry.recordedAt}::timestamptz,
        'online',
        ${telemetry.batteryPercent},
        ${telemetry.batteryMv},
        ${telemetry.signalQuality},
        ${telemetry.gpsFixState},
        ${telemetry.lat},
        ${telemetry.lng}
      )
      on conflict (device_id) do update
      set
        last_seen_at = excluded.last_seen_at,
        online_state = excluded.online_state,
        battery_percent = excluded.battery_percent,
        battery_mv = excluded.battery_mv,
        signal_quality = excluded.signal_quality,
        gps_fix_state = excluded.gps_fix_state,
        last_lat = excluded.last_lat,
        last_lng = excluded.last_lng
    `;

    return {
      duplicate: !telemetryInserted,
      telemetryInserted,
      statusUpserted: true
    };
  });
}
