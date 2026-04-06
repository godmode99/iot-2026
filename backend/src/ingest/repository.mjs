import { getDb } from "../db.mjs";

export async function findDeviceByDeviceId(deviceId) {
  const sql = getDb();
  const rows = await sql`
    select
      id,
      device_id,
      serial_number,
      farm_id,
      provisioning_state,
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

    if (telemetry.firmwareVersion) {
      await trx`
        update public.devices
        set firmware_version = ${telemetry.firmwareVersion}
        where id = ${device.id}
          and coalesce(firmware_version, '') <> ${telemetry.firmwareVersion}
      `;
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
        last_seen_at = greatest(coalesce(device_status.last_seen_at, '-infinity'::timestamptz), excluded.last_seen_at),
        online_state = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.online_state
          else device_status.online_state
        end,
        battery_percent = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.battery_percent
          else device_status.battery_percent
        end,
        battery_mv = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.battery_mv
          else device_status.battery_mv
        end,
        signal_quality = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.signal_quality
          else device_status.signal_quality
        end,
        gps_fix_state = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.gps_fix_state
          else device_status.gps_fix_state
        end,
        last_lat = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.last_lat
          else device_status.last_lat
        end,
        last_lng = case
          when device_status.last_seen_at is null or excluded.last_seen_at >= device_status.last_seen_at
            then excluded.last_lng
          else device_status.last_lng
        end
    `;

    return {
      duplicate: !telemetryInserted,
      telemetryInserted,
      statusUpserted: true
    };
  });
}
