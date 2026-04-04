import { parseProvisioningQr } from "./qr-parser.mjs";
import {
  bindDeviceToFarm,
  findProvisioningDevice,
  listOwnedFarms
} from "./repository.mjs";

export async function resolveProvisioningTarget({ qr, deviceId, actorUserId }) {
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

  if (!actorUserId) {
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

  const farms = await listOwnedFarms(actorUserId);
  return {
    ok: true,
    statusCode: 200,
    code: device.farm_id ? "already_bound" : "valid_unbound",
    result: {
      device,
      state: device.farm_id ? "already_bound" : "valid_unbound",
      farms,
      actorUserId
    }
  };
}

export async function bindProvisioningTarget({ qr, deviceId, farmId, actorUserId }) {
  if (!actorUserId) {
    return {
      ok: false,
      statusCode: 401,
      code: "actor_missing",
      details: ["actor_user_id is required"]
    };
  }

  if (!farmId) {
    return {
      ok: false,
      statusCode: 400,
      code: "farm_missing",
      details: ["farm_id is required"]
    };
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
    actorUserId,
    requestSource: "web_qr"
  });
}
