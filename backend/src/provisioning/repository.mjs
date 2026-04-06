import { getDb } from "../db.mjs";

export async function findProvisioningDevice(deviceId) {
  const sql = getDb();
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

export async function listOwnedFarms(actorUserId) {
  const sql = getDb();
  return sql`
    select
      id,
      name,
      owner_user_id
    from public.farms
    where owner_user_id = ${actorUserId}
    order by name asc
  `;
}

export async function bindDeviceToFarm({ deviceId, farmId, actorUserId, requestSource = "web_qr" }) {
  const sql = getDb();

  return sql.begin(async (trx) => {
    const deviceRows = await trx`
      select
        d.id,
        d.device_id,
        d.serial_number,
        d.farm_id,
        d.provisioning_state
      from public.devices d
      where d.device_id = ${deviceId}
      limit 1
    `;

    const device = deviceRows[0] ?? null;
    if (!device) {
      return {
        ok: false,
        statusCode: 404,
        code: "device_unknown",
        details: [deviceId]
      };
    }

    const farmRows = await trx`
      select id, name, owner_user_id
      from public.farms
      where id = ${farmId}
      limit 1
    `;

    const farm = farmRows[0] ?? null;
    if (!farm) {
      return {
        ok: false,
        statusCode: 404,
        code: "farm_unknown",
        details: [farmId]
      };
    }

    if (farm.owner_user_id !== actorUserId) {
      return {
        ok: false,
        statusCode: 403,
        code: "farm_not_owned",
        details: [actorUserId, farmId]
      };
    }

    if (device.provisioning_state === "retired") {
      return {
        ok: false,
        statusCode: 409,
        code: "device_retired",
        details: [device.device_id]
      };
    }

    if (device.farm_id && device.farm_id !== farmId) {
      return {
        ok: false,
        statusCode: 409,
        code: "device_already_bound",
        details: [device.device_id, device.farm_id]
      };
    }

    const targetProvisioningState = device.provisioning_state === "active" ? "active" : "bound";

    const deviceUpdate = await trx`
      update public.devices
      set
        farm_id = ${farmId},
        provisioning_state = ${targetProvisioningState}
      where id = ${device.id}
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
        ${device.id},
        'provision_bind',
        ${actorUserId},
        ${requestSource},
        'succeeded',
        timezone('utc', now()),
        ${trx.json({
          device_id: device.device_id,
          farm_id: farmId,
          actor_user_id: actorUserId
        })}::jsonb
      )
    `;

    return {
      ok: true,
      statusCode: 200,
      code: device.farm_id === farmId ? "device_already_bound_same_farm" : "device_bound",
      result: {
        device: deviceUpdate[0],
        farm: {
          id: farm.id,
          name: farm.name
        }
      }
    };
  });
}
