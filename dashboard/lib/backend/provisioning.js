import { fail, getDashboardDb, ok, userCanManageFarmSettings } from "./db.js";

function parseProvisioningQr(input) {
  if (typeof input !== "string" || input.trim() === "") {
    return fail("qr_missing", ["Provide qr or device_id"]);
  }

  const raw = input.trim();
  if (/^[a-z0-9-]+$/i.test(raw) && raw.startsWith("sb00-")) {
    return { ok: true, deviceId: raw };
  }

  try {
    const url = new URL(raw);
    const deviceId = url.searchParams.get("device_id") ?? url.searchParams.get("d");
    if (deviceId) {
      return { ok: true, deviceId: deviceId.trim() };
    }
  } catch {
    // Not a URL. Continue to fallback parsers.
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.device_id === "string" && parsed.device_id.trim() !== "") {
        return { ok: true, deviceId: parsed.device_id.trim() };
      }
    } catch {
      return fail("qr_invalid_json", ["QR payload JSON could not be parsed"]);
    }
  }

  if (raw.includes("device_id=")) {
    const params = new URLSearchParams(raw);
    const deviceId = params.get("device_id");
    if (deviceId) {
      return { ok: true, deviceId: deviceId.trim() };
    }
  }

  return fail("qr_invalid", ["Unsupported QR payload format"]);
}

async function findProvisioningDevice(sql, deviceId) {
  const rows = await sql`
    select
      d.id,
      d.device_id,
      d.serial_number,
      d.farm_id,
      d.provisioning_state,
      d.firmware_version,
      d.battery_variant,
      d.battery_profile_version,
      d.usable_capacity_mah,
      farm.name as farm_name
    from public.devices d
    left join public.farms farm
      on farm.id = d.farm_id
    where d.device_id = ${deviceId}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function resolveProvisioningTarget({ qr, actorUserId }) {
  const parsed = parseProvisioningQr(qr);
  if (!parsed.ok) {
    return parsed;
  }

  const sql = getDashboardDb();
  const device = await findProvisioningDevice(sql, parsed.deviceId);
  if (!device) {
    return fail("device_unknown", [parsed.deviceId], 404);
  }

  const farms = actorUserId
    ? await sql`
        select id, name, owner_user_id
        from public.farms
        where owner_user_id = ${actorUserId}::uuid
        order by name asc
      `
    : [];

  return ok(device.farm_id ? "already_bound" : "valid_unbound", {
    device,
    state: device.farm_id ? "already_bound" : "valid_unbound",
    farms,
    actorUserId: actorUserId ?? null,
    actorMode: actorUserId ? "supabase_session" : null
  });
}

export async function bindProvisioningTarget({ qr, farmId, actorUserId }) {
  if (!farmId) {
    return fail("farm_missing", ["farm_id is required"]);
  }

  const parsed = parseProvisioningQr(qr);
  if (!parsed.ok) {
    return parsed;
  }

  const sql = getDashboardDb();
  const allowed = await userCanManageFarmSettings(sql, actorUserId, farmId);
  if (!allowed) {
    return fail("farm_not_owned", [actorUserId, farmId], 403);
  }

  return sql.begin(async (trx) => {
    const device = await findProvisioningDevice(trx, parsed.deviceId);
    if (!device) {
      return fail("device_unknown", [parsed.deviceId], 404);
    }

    const farmRows = await trx`
      select id, name, owner_user_id
      from public.farms
      where id = ${farmId}::uuid
      limit 1
    `;
    const farm = farmRows[0] ?? null;
    if (!farm) {
      return fail("farm_unknown", [farmId], 404);
    }

    if (device.provisioning_state === "retired") {
      return fail("device_retired", [device.device_id], 409);
    }

    if (device.farm_id && device.farm_id !== farmId) {
      return fail("device_already_bound", [device.device_id, device.farm_id], 409);
    }

    const targetProvisioningState = device.provisioning_state === "active" ? "active" : "bound";
    const deviceUpdate = await trx`
      update public.devices
      set
        farm_id = ${farmId}::uuid,
        provisioning_state = ${targetProvisioningState}
      where id = ${device.id}::uuid
      returning device_id, serial_number, farm_id, provisioning_state
    `;

    await trx`
      insert into public.command_log (
        device_id,
        command_type,
        requested_by,
        request_source,
        status,
        completed_at,
        details_json
      ) values (
        ${device.id}::uuid,
        'provision_bind',
        ${actorUserId}::uuid,
        'web_qr',
        'succeeded',
        timezone('utc', now()),
        ${trx.json({
          device_id: device.device_id,
          farm_id: farmId,
          actor_user_id: actorUserId
        })}::jsonb
      )
    `;

    return ok(device.farm_id === farmId ? "device_already_bound_same_farm" : "device_bound", {
      device: deviceUpdate[0],
      farm: {
        id: farm.id,
        name: farm.name
      }
    });
  });
}
