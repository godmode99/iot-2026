import { buildTrustedActorHeaders, fetchBackendJson } from "./admin.js";

function jsonHeaders(actorUserId) {
  return buildTrustedActorHeaders(actorUserId, { "content-type": "application/json" });
}

export async function queueDeviceCommand({ deviceId, actorUserId, commandType, note }) {
  return fetchBackendJson(`/api/admin/devices/${encodeURIComponent(deviceId)}/commands`, {
    method: "POST",
    headers: jsonHeaders(actorUserId),
    body: JSON.stringify({
      command_type: commandType,
      details: {
        note: note ?? ""
      }
    })
  });
}

export async function updateAlertStatus({ alertId, action, actorUserId, note }) {
  return fetchBackendJson(`/api/admin/alerts/${encodeURIComponent(alertId)}/${encodeURIComponent(action)}`, {
    method: "POST",
    headers: jsonHeaders(actorUserId),
    body: JSON.stringify({
      note: note ?? `dashboard_${action}`
    })
  });
}
