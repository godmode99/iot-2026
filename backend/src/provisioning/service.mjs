import { parseProvisioningQr } from "./qr-parser.mjs";
import { resolveProvisioningActor } from "./auth.mjs";
import {
  bindDeviceToFarm,
  findProvisioningDevice,
  listOwnedFarms
} from "./repository.mjs";

export async function resolveProvisioningTarget({ config, headers = {}, qr, deviceId, actorUserId }) {
  const parsed = parseProvisioningQr(qr ?? deviceId ?? "");
  if (!parsed.ok) {
    return {
      ok: false,
      statusCode: 400,
      code: parsed.code,
      details: parsed.details
    };
  }

  const device = await findProvisioningDevice(parsed.deviceId);
  if (!device) {
    return {
      ok: false,
      statusCode: 404,
      code: "device_unknown",
      details: [parsed.deviceId]
    };
  }

  const actor = resolveProvisioningActor(config, actorUserId, headers);
  if (!actor.ok && actor.code === "actor_missing") {
    return {
      ok: true,
      statusCode: 200,
      code: device.farm_id ? "already_bound" : "valid_unbound",
      result: {
        device,
        state: device.farm_id ? "already_bound" : "valid_unbound",
        farms: [],
        actorUserId: null
      }
    };
  }

  if (!actor.ok) {
    return actor;
  }

  const farms = await listOwnedFarms(actor.actorUserId);
  return {
    ok: true,
    statusCode: 200,
    code: device.farm_id ? "already_bound" : "valid_unbound",
    result: {
      device,
      state: device.farm_id ? "already_bound" : "valid_unbound",
      farms,
      actorUserId: actor.actorUserId,
      actorMode: actor.mode
    }
  };
}

export async function bindProvisioningTarget({ config, headers = {}, qr, deviceId, farmId, actorUserId }) {
  if (!farmId) {
    return {
      ok: false,
      statusCode: 400,
      code: "farm_missing",
      details: ["farm_id is required"]
    };
  }

  const actor = resolveProvisioningActor(config, actorUserId, headers);
  if (!actor.ok) {
    return actor;
  }

  const parsed = parseProvisioningQr(qr ?? deviceId ?? "");
  if (!parsed.ok) {
    return {
      ok: false,
      statusCode: 400,
      code: parsed.code,
      details: parsed.details
    };
  }

  return bindDeviceToFarm({
    deviceId: parsed.deviceId,
    farmId,
    actorUserId: actor.actorUserId,
    requestSource: "web_qr"
  });
}
