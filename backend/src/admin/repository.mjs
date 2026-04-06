import { getDb } from "../db.mjs";

export async function findDeviceForCommand(deviceId) {
  const sql = getDb();
  const rows = await sql`
    select id, device_id, serial_number, farm_id, provisioning_state, firmware_version
    from public.devices
    where device_id = ${deviceId}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function queueDeviceCommand({ device, commandType, requestedBy, requestSource, details }) {
  const sql = getDb();
  const rows = await sql`
    insert into public.command_log (
      device_id,
      command_type,
      requested_by,
      request_source,
      status,
      details_json
    ) values (
      ${device.id},
      ${commandType},
      ${requestedBy ?? null},
      ${requestSource},
      'queued',
      ${sql.json(details)}::jsonb
    )
    returning id, command_type, status, requested_at, details_json
  `;
  return rows[0] ?? null;
}

export async function listRecentCommandLog(limit = 50, deviceId = null) {
  const sql = getDb();
  if (deviceId) {
    return sql`
      select
        c.id,
        c.command_type,
        c.request_source,
        c.status,
        c.requested_at,
        c.completed_at,
        c.details_json,
        d.device_id,
        d.serial_number
      from public.command_log c
      join public.devices d
        on d.id = c.device_id
      where d.device_id = ${deviceId}
      order by c.requested_at desc
      limit ${Math.max(1, Math.min(limit, 200))}
    `;
  }

  return sql`
    select
      c.id,
      c.command_type,
      c.request_source,
      c.status,
      c.requested_at,
      c.completed_at,
      c.details_json,
      d.device_id,
      d.serial_number
    from public.command_log c
    join public.devices d
      on d.id = c.device_id
    order by c.requested_at desc
    limit ${Math.max(1, Math.min(limit, 200))}
  `;
}

export async function claimPendingCommandsForDevice(device, limit = 20) {
  const sql = getDb();

  return sql.begin(async (trx) => {
    const pending = await trx`
      select id
      from public.command_log
      where device_id = ${device.id}
        and status = 'queued'
      order by requested_at asc
      limit ${Math.max(1, Math.min(limit, 50))}
    `;

    if (pending.length === 0) {
      return [];
    }

    const ids = pending.map((row) => row.id);
    return trx`
      update public.command_log
      set status = 'sent'
      where id in ${trx(ids)}
      returning id, command_type, status, requested_at, completed_at, details_json
    `;
  });
}

export async function acknowledgeDeviceCommand({ device, commandId, status, details = {} }) {
  const sql = getDb();

  return sql.begin(async (trx) => {
    const rows = await trx`
      select id, status, details_json
      from public.command_log
      where id = ${commandId}::uuid
        and device_id = ${device.id}
      limit 1
    `;

    const command = rows[0] ?? null;
    if (!command) {
      return null;
    }

    const mergedDetails = {
      ...(command.details_json ?? {}),
      ack: {
        status,
        receivedAt: new Date().toISOString(),
        details
      }
    };

    const updated = await trx`
      update public.command_log
      set
        status = ${status},
        completed_at = timezone('utc', now()),
        details_json = ${trx.json(mergedDetails)}::jsonb
      where id = ${command.id}
      returning id, command_type, status, requested_at, completed_at, details_json
    `;

    return updated[0] ?? null;
  });
}

export async function listFarmNotificationTargets() {
  const sql = getDb();
  return sql`
    select
      id,
      name,
      owner_user_id,
      alert_email_to,
      alert_line_user_id,
      updated_at
    from public.farms
    order by name asc
  `;
}

export async function updateFarmNotificationTargets({ farmId, alertEmailTo, alertLineUserId }) {
  const sql = getDb();
  const rows = await sql`
    update public.farms
    set
      alert_email_to = ${alertEmailTo ?? null},
      alert_line_user_id = ${alertLineUserId ?? null},
      updated_at = timezone('utc', now())
    where id = ${farmId}::uuid
    returning
      id,
      name,
      owner_user_id,
      alert_email_to,
      alert_line_user_id,
      updated_at
  `;

  return rows[0] ?? null;
}
