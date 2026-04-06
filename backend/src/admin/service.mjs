import {
  acknowledgeDeviceCommand,
  claimPendingCommandsForDevice,
  findDeviceForCommand,
  listFarmNotificationTargets,
  listRecentCommandLog,
  queueDeviceCommand,
  updateFarmNotificationTargets
} from "./repository.mjs";

const allowedCommandTypes = new Set([
  "reboot",
  "config_refresh",
  "ota_check",
  "ota_apply",
  "telemetry_flush"
]);

const terminalCommandStatuses = new Set([
  "succeeded",
  "failed",
  "cancelled"
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export async function enqueueDeviceCommand({ deviceId, commandType, requestedBy, requestSource, details = {} }) {
  if (!allowedCommandTypes.has(commandType)) {
    return {
      ok: false,
      statusCode: 400,
      code: "command_type_invalid",
      details: [commandType]
    };
  }

  const device = await findDeviceForCommand(deviceId);
  if (!device) {
    return {
      ok: false,
      statusCode: 404,
      code: "device_unknown",
      details: [deviceId]
    };
  }

  if (device.provisioning_state === "retired") {
    return {
      ok: false,
      statusCode: 409,
      code: "device_retired",
      details: [deviceId]
    };
  }

  const command = await queueDeviceCommand({
    device,
    commandType,
    requestedBy: requestedBy ?? null,
    requestSource,
    details: {
      ...details,
      device_id: device.device_id,
      firmware_version: device.firmware_version
    }
  });

  return {
    ok: true,
    statusCode: 202,
    code: "command_queued",
    result: {
      device,
      command
    }
  };
}

export async function getRecentCommandLog({ limit = 50, deviceId = null } = {}) {
  return listRecentCommandLog(limit, deviceId);
}

export async function getFarmNotificationTargets() {
  return listFarmNotificationTargets();
}

export async function saveFarmNotificationTargets({ farmId, alertEmailTo, alertLineUserId }, dependencies = {}) {
  const updateTargets = dependencies.updateTargets ?? updateFarmNotificationTargets;
  const normalizedEmail = normalizeOptionalValue(alertEmailTo);
  const normalizedLineUserId = normalizeOptionalValue(alertLineUserId);

  if (!farmId) {
    return {
      ok: false,
      statusCode: 400,
      code: "farm_id_required",
      details: []
    };
  }

  if (normalizedEmail && !emailPattern.test(normalizedEmail)) {
    return {
      ok: false,
      statusCode: 400,
      code: "alert_email_invalid",
      details: [normalizedEmail]
    };
  }

  const farm = await updateTargets({
    farmId,
    alertEmailTo: normalizedEmail,
    alertLineUserId: normalizedLineUserId
  });

  if (!farm) {
    return {
      ok: false,
      statusCode: 404,
      code: "farm_not_found",
      details: [farmId]
    };
  }

  return {
    ok: true,
    statusCode: 200,
    code: "farm_notification_targets_updated",
    result: {
      farm
    }
  };
}

export async function fetchPendingCommandsForDevice({ deviceId, limit = 20 }, dependencies = {}) {
  const findDevice = dependencies.findDevice ?? findDeviceForCommand;
  const claimPending = dependencies.claimPending ?? claimPendingCommandsForDevice;

  const device = await findDevice(deviceId);
  if (!device) {
    return {
      ok: false,
      statusCode: 404,
      code: "device_unknown",
      details: [deviceId]
    };
  }

  if (device.provisioning_state === "retired") {
    return {
      ok: false,
      statusCode: 409,
      code: "device_retired",
      details: [deviceId]
    };
  }

  const commands = await claimPending(device, limit);
  return {
    ok: true,
    statusCode: 200,
    code: commands.length > 0 ? "commands_available" : "no_commands",
    result: {
      device,
      commands
    }
  };
}

export async function acknowledgeCommandResult({ deviceId, commandId, status, details = {} }, dependencies = {}) {
  if (!terminalCommandStatuses.has(status)) {
    return {
      ok: false,
      statusCode: 400,
      code: "command_status_invalid",
      details: [status]
    };
  }

  const findDevice = dependencies.findDevice ?? findDeviceForCommand;
  const acknowledge = dependencies.acknowledge ?? acknowledgeDeviceCommand;
  const device = await findDevice(deviceId);

  if (!device) {
    return {
      ok: false,
      statusCode: 404,
      code: "device_unknown",
      details: [deviceId]
    };
  }

  const command = await acknowledge({
    device,
    commandId,
    status,
    details
  });

  if (!command) {
    return {
      ok: false,
      statusCode: 404,
      code: "command_not_found",
      details: [commandId, deviceId]
    };
  }

  return {
    ok: true,
    statusCode: 200,
    code: "command_acknowledged",
    result: {
      device,
      command
    }
  };
}
