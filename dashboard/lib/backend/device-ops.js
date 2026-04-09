import {
  actorTypeForUser,
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

export async function createRecordDrivenAlert({
  farmId,
  recordId,
  actorUserId,
  alertType,
  severity,
  note,
  details = {}
}) {
  if (!farmId || !recordId || !alertType) {
    return fail("alert_create_invalid", [farmId, recordId, alertType]);
  }

  if (!["critical", "warning", "info"].includes(severity)) {
    return fail("alert_severity_invalid", [severity]);
  }

  const sql = getDashboardDb();
  const allowed = await userCanManageFarmAlerts(sql, actorUserId, farmId);
  if (!allowed) {
    return fail("alert_permission_denied", [farmId, alertType], 403);
  }

  const existingRows = await sql`
    select id, alert_type, severity, status, opened_at
    from public.alerts
    where farm_id = ${farmId}::uuid
      and alert_type = ${alertType}
      and status = 'open'
    order by opened_at desc
    limit 1
  `;
  const existing = existingRows[0] ?? null;

  if (existing) {
    return ok("alert_already_open", { alert: existing }, 200);
  }

  const actorType = await actorTypeForUser(sql, actorUserId);
  const insertedRows = await sql`
    insert into public.alerts (
      farm_id,
      device_id,
      alert_type,
      severity,
      status,
      opened_at,
      details_json
    ) values (
      ${farmId}::uuid,
      null,
      ${alertType},
      ${severity},
      'open',
      timezone('utc', now()),
      ${sql.json({
        source: "record_detail",
        source_record_id: recordId,
        note: note ?? "",
        created_by: actorUserId ?? null,
        created_by_type: actorType,
        ...details
      })}::jsonb
    )
    returning id, alert_type, severity, status, opened_at, details_json
  `;

  return ok("alert_created", {
    alert: insertedRows[0] ?? null
  }, 201);
}

export async function createTelemetryDrivenAlert({
  farmId,
  deviceId,
  actorUserId,
  alertType,
  severity,
  note,
  details = {}
}) {
  if (!farmId || !deviceId || !alertType) {
    return fail("alert_create_invalid", [farmId, deviceId, alertType]);
  }

  if (!["critical", "warning", "info"].includes(severity)) {
    return fail("alert_severity_invalid", [severity]);
  }

  const sql = getDashboardDb();
  const allowed = await userCanManageFarmAlerts(sql, actorUserId, farmId);
  if (!allowed) {
    return fail("alert_permission_denied", [farmId, deviceId, alertType], 403);
  }

  const deviceRows = await sql`
    select id, device_id, serial_number
    from public.devices
    where device_id = ${deviceId}
    limit 1
  `;
  const device = deviceRows[0] ?? null;

  if (!device) {
    return fail("device_unknown", [deviceId], 404);
  }

  const existingRows = await sql`
    select id, alert_type, severity, status, opened_at
    from public.alerts
    where farm_id = ${farmId}::uuid
      and device_id = ${device.id}::uuid
      and alert_type = ${alertType}
      and status = 'open'
    order by opened_at desc
    limit 1
  `;
  const existing = existingRows[0] ?? null;

  if (existing) {
    return ok("alert_already_open", { alert: existing }, 200);
  }

  const actorType = await actorTypeForUser(sql, actorUserId);
  const insertedRows = await sql`
    insert into public.alerts (
      farm_id,
      device_id,
      alert_type,
      severity,
      status,
      opened_at,
      details_json
    ) values (
      ${farmId}::uuid,
      ${device.id}::uuid,
      ${alertType},
      ${severity},
      'open',
      timezone('utc', now()),
      ${sql.json({
        source: "device_telemetry",
        source_device_id: device.device_id,
        source_serial_number: device.serial_number,
        note: note ?? "",
        created_by: actorUserId ?? null,
        created_by_type: actorType,
        ...details
      })}::jsonb
    )
    returning id, alert_type, severity, status, opened_at, details_json
  `;

  return ok("alert_created", {
    alert: insertedRows[0] ?? null
  }, 201);
}

export async function createMissingRecordAlert({
  farmId,
  actorUserId,
  templateId,
  templateCode,
  templateName,
  note,
  details = {}
}) {
  if (!farmId || !templateId || !templateCode) {
    return fail("alert_create_invalid", [farmId, templateId, templateCode]);
  }

  const sql = getDashboardDb();
  const allowed = await userCanManageFarmAlerts(sql, actorUserId, farmId);
  if (!allowed) {
    return fail("alert_permission_denied", [farmId, templateCode], 403);
  }

  const existingRows = await sql`
    select id, alert_type, severity, status, opened_at
    from public.alerts
    where farm_id = ${farmId}::uuid
      and alert_type = 'missing_record'
      and status = 'open'
      and details_json->>'source_template_code' = ${templateCode}
    order by opened_at desc
    limit 1
  `;
  const existing = existingRows[0] ?? null;

  if (existing) {
    return ok("alert_already_open", { alert: existing }, 200);
  }

  const actorType = await actorTypeForUser(sql, actorUserId);
  const insertedRows = await sql`
    insert into public.alerts (
      farm_id,
      device_id,
      alert_type,
      severity,
      status,
      opened_at,
      details_json
    ) values (
      ${farmId}::uuid,
      null,
      'missing_record',
      'warning',
      'open',
      timezone('utc', now()),
      ${sql.json({
        source: "record_expectation",
        source_template_id: templateId,
        source_template_code: templateCode,
        source_template_name: templateName ?? templateCode,
        note: note ?? "",
        created_by: actorUserId ?? null,
        created_by_type: actorType,
        ...details
      })}::jsonb
    )
    returning id, alert_type, severity, status, opened_at, details_json
  `;

  return ok("alert_created", {
    alert: insertedRows[0] ?? null
  }, 201);
}

export async function resolveMissingRecordAlertsForTemplate({
  farmId,
  actorUserId,
  templateCode,
  note
}) {
  if (!farmId || !templateCode) {
    return fail("alert_resolve_invalid", [farmId, templateCode]);
  }

  const sql = getDashboardDb();
  const allowed = await userCanManageFarmAlerts(sql, actorUserId, farmId);
  if (!allowed) {
    return ok("alert_resolve_skipped_permission", {
      resolvedCount: 0
    });
  }

  const matchingAlerts = await sql`
    select id, details_json
    from public.alerts
    where farm_id = ${farmId}::uuid
      and alert_type = 'missing_record'
      and status = 'open'
      and details_json->>'source_template_code' = ${templateCode}
    order by opened_at desc
  `;

  if (!matchingAlerts.length) {
    return ok("alert_resolve_not_needed", {
      resolvedCount: 0
    });
  }

  const adminAction = {
    action: "resolve",
    requestedBy: actorUserId ?? null,
    note: note ?? `record_submitted_for_${templateCode}`,
    at: new Date().toISOString()
  };

  const alertIds = matchingAlerts.map((alert) => alert.id);
  await sql`
    update public.alerts
    set
      status = 'resolved',
      resolved_at = timezone('utc', now()),
      details_json = jsonb_set(
        coalesce(details_json, '{}'::jsonb),
        '{admin_actions}',
        coalesce(details_json->'admin_actions', '[]'::jsonb) || ${sql.json([adminAction])}::jsonb,
        true
      )
    where id in ${sql(alertIds)}
  `;

  return ok("alert_resolved", {
    resolvedCount: alertIds.length
  });
}
