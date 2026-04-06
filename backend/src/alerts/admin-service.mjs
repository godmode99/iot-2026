import { findAlertById, updateAlertStatusById } from "./repository.mjs";

const allowedStatusTransitions = new Map([
  ["acknowledge", "acknowledged"],
  ["suppress", "suppressed"],
  ["resolve", "resolved"]
]);

export async function adminUpdateAlertStatus({ alertId, action, requestedBy, note = "" }, dependencies = {}) {
  const nextStatus = allowedStatusTransitions.get(action);
  if (!nextStatus) {
    return {
      ok: false,
      statusCode: 400,
      code: "alert_action_invalid",
      details: [action]
    };
  }

  const findAlert = dependencies.findAlert ?? findAlertById;
  const updateAlert = dependencies.updateAlert ?? updateAlertStatusById;
  const alert = await findAlert(alertId);

  if (!alert) {
    return {
      ok: false,
      statusCode: 404,
      code: "alert_not_found",
      details: [alertId]
    };
  }

  if (alert.status === nextStatus) {
    return {
      ok: true,
      statusCode: 200,
      code: "alert_status_unchanged",
      result: {
        alert
      }
    };
  }

  const updated = await updateAlert(alertId, nextStatus, {
    action,
    requestedBy: requestedBy ?? null,
    note,
    at: new Date().toISOString()
  });

  return {
    ok: true,
    statusCode: 200,
    code: "alert_status_updated",
    result: {
      alert: updated
    }
  };
}
