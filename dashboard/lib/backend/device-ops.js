import {
  fail,
  getDashboardDb,
  ok,
  userCanManageFarmAlerts,
  userCanSendFarmCommand
} from "./db.js";

const allowedCommandTypes = new Set([
  "reboot",
  "config_refresh",
  "ota_check",
  "ota_apply",
  "telemetry_flush"
]);

const alertStatusTransitions = new Map([
  ["acknowledge", "acknowledged"],
  ["suppress", "suppressed"],
  ["resolve", "resolved"]
]);

export async function queueDeviceCommand({ deviceId, actorUserId, commandType, note }) {
  if (!allowedCommandTypes.has(commandType)) {
    return fail("command_type_invalid", [commandType]);
  }

  const sql = getDashboardDb();
  const deviceRows = await sql`
    select id, device_id, serial_number, farm_id, provisioning_state, firmware_version
    from public.devices
    where device_id = ${deviceId}
    limit 1
  `;
  const device = deviceRows[0] ?? null;

  if (!device) {
    return fail("device_unknown", [deviceId], 404);
  }
  if (device.provisioning_state === "retired") {
    return fail("device_retired", [deviceId], 409);
  }

  const allowed = await userCanSendFarmCommand(sql, actorUserId, device.farm_id, commandType);
  if (!allowed) {
    return fail("command_permission_denied", [deviceId, commandType], 403);
  }

  const commandRows = await sql`
    insert into public.command_log (
      device_id,
      command_type,
      requested_by,
      request_source,
      status,
      details_json
    ) values (
      ${device.id}::uuid,
      ${commandType},
      ${actorUserId}::uuid,
      'dashboard',
      'queued',
      ${sql.json({
        note: note ?? "",
        device_id: device.device_id,
        firmware_version: device.firmware_version
      })}::jsonb
    )
    returning id, command_type, status, requested_at, details_json
  `;

  return ok("command_queued", {
    device,
    command: commandRows[0] ?? null
  }, 202);
}

export async function updateAlertStatus({ alertId, action, actorUserId, note }) {
  const nextStatus = alertStatusTransitions.get(action);
  if (!nextStatus) {
    return fail("alert_action_invalid", [action]);
  }

  const sql = getDashboardDb();
  const alertRows = await sql`
    select id, device_id, farm_id, alert_type, status, severity, opened_at, resolved_at, details_json
    from public.alerts
    where id = ${alertId}::uuid
    limit 1
  `;
  const alert = alertRows[0] ?? null;

  if (!alert) {
    return fail("alert_not_found", [alertId], 404);
  }

  const allowed = await userCanManageFarmAlerts(sql, actorUserId, alert.farm_id);
  if (!allowed) {
    return fail("alert_permission_denied", [alertId, action], 403);
  }

  if (alert.status === nextStatus) {
    return ok("alert_status_unchanged", { alert });
  }

  const adminAction = {
    action,
    requestedBy: actorUserId ?? null,
    note: note ?? `dashboard_${action}`,
    at: new Date().toISOString()
  };

  const updatedRows = await sql`
    update public.alerts
    set
      status = ${nextStatus},
      resolved_at = case
        when ${nextStatus} = 'resolved' then timezone('utc', now())
        else resolved_at
      end,
      details_json = jsonb_set(
        coalesce(details_json, '{}'::jsonb),
        '{admin_actions}',
        coalesce(details_json->'admin_actions', '[]'::jsonb) || ${sql.json([adminAction])}::jsonb,
        true
      )
    where id = ${alert.id}::uuid
    returning id, alert_type, status, severity, opened_at, resolved_at, details_json
  `;

  return ok("alert_status_updated", {
    alert: updatedRows[0] ?? null
  });
}
