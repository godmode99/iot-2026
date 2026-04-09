"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { createTelemetryDrivenAlert, queueDeviceCommand, updateAlertStatus } from "@/lib/backend/device-ops.js";

const SAFE_COMMANDS = new Set(["reboot", "config_refresh", "ota_check", "telemetry_flush"]);
const ALERT_ACTIONS = new Set(["acknowledge", "suppress", "resolve"]);

async function requireDevicePermission(deviceId, { commandType = null, manageAlerts = false } = {}) {
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: `/devices/${deviceId}` }));
  }

  const supabase = await createSupabaseServerClient();
  const deviceResult = await supabase
    .from("devices")
    .select("id,farm_id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (deviceResult.error || !deviceResult.data?.farm_id) {
    redirect(withParams(`/devices/${deviceId}`, { error: "device_not_visible" }));
  }

  if (commandType) {
    const permissionResult = await supabase.rpc("can_send_farm_command", {
      target_farm_id: deviceResult.data.farm_id,
      command_type: commandType
    });

    if (permissionResult.data !== true) {
      redirect(withParams(`/devices/${deviceId}`, { error: "command_permission_denied" }));
    }
  }

  if (manageAlerts) {
    const permissionResult = await supabase.rpc("can_manage_farm_alerts", {
      target_farm_id: deviceResult.data.farm_id
    });

    if (permissionResult.data !== true) {
      redirect(withParams(`/devices/${deviceId}`, { error: "alert_permission_denied" }));
    }
  }

  return user;
}

export async function submitDeviceCommand(formData) {
  const deviceId = String(formData.get("device_id") ?? "");
  const commandType = String(formData.get("command_type") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!SAFE_COMMANDS.has(commandType) && commandType !== "ota_apply") {
    redirect(withParams(`/devices/${deviceId}`, { error: "command_type_invalid" }));
  }

  const user = await requireDevicePermission(deviceId, { commandType });
  const result = await queueDeviceCommand({
    deviceId,
    actorUserId: user.id,
    commandType,
    note
  });

  if (!result.ok) {
    redirect(withParams(`/devices/${deviceId}`, { error: result.code ?? "command_queue_failed" }));
  }

  redirect(withParams(`/devices/${deviceId}`, { command: "queued" }));
}

export async function submitAlertAction(formData) {
  const deviceId = String(formData.get("device_id") ?? "");
  const alertId = String(formData.get("alert_id") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!ALERT_ACTIONS.has(action)) {
    redirect(withParams(`/devices/${deviceId}`, { error: "alert_action_invalid" }));
  }

  const user = await requireDevicePermission(deviceId, { manageAlerts: true });
  const result = await updateAlertStatus({
    alertId,
    action,
    actorUserId: user.id,
    note: `dashboard_${action}`
  });

  if (!result.ok) {
    redirect(withParams(`/devices/${deviceId}`, { error: result.code ?? "alert_action_failed" }));
  }

  redirect(withParams(`/devices/${deviceId}`, { alert: action }));
}

const TELEMETRY_ALERT_SEVERITIES = new Set(["critical", "warning", "info"]);

export async function createTelemetryAlertAction(formData) {
  const deviceId = String(formData.get("device_id") ?? "").trim();
  const alertType = String(formData.get("alert_type") ?? "").trim();
  const severity = String(formData.get("severity") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!deviceId || !alertType || !TELEMETRY_ALERT_SEVERITIES.has(severity)) {
    redirect(withParams(`/devices/${deviceId}`, { error: "alert_create_invalid" }));
  }

  const user = await requireDevicePermission(deviceId, { manageAlerts: true });
  const supabase = await createSupabaseServerClient();
  const deviceResult = await supabase
    .from("devices")
    .select("id,farm_id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (deviceResult.error || !deviceResult.data?.farm_id) {
    redirect(withParams(`/devices/${deviceId}`, { error: "device_not_visible" }));
  }

  const latestTelemetryResult = await supabase
    .from("telemetry")
    .select("id,recorded_at,temperature_c,turbidity_raw,battery_percent,battery_mv,lat,lng")
    .eq("device_id", deviceResult.data.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const telemetrySnapshot = latestTelemetryResult.data ?? null;
  const result = await createTelemetryDrivenAlert({
    farmId: deviceResult.data.farm_id,
    deviceId,
    actorUserId: user.id,
    alertType,
    severity,
    note,
    details: {
      telemetry_recorded_at: telemetrySnapshot?.recorded_at ?? null,
      telemetry_snapshot: telemetrySnapshot
        ? {
          temperature_c: telemetrySnapshot.temperature_c,
          turbidity_raw: telemetrySnapshot.turbidity_raw,
          battery_percent: telemetrySnapshot.battery_percent,
          battery_mv: telemetrySnapshot.battery_mv,
          lat: telemetrySnapshot.lat,
          lng: telemetrySnapshot.lng
        }
        : null
    }
  });

  const createdAlertId = result.result?.alert?.id;

  if (!result.ok) {
    redirect(withParams(`/devices/${deviceId}`, { error: result.code ?? "alert_create_failed" }));
  }

  if (result.code === "alert_already_open" && createdAlertId) {
    redirect(withParams(`/alerts/${createdAlertId}`, { alert: "already_open" }));
  }

  if (createdAlertId) {
    redirect(withParams(`/alerts/${createdAlertId}`, { alert: "created_from_telemetry" }));
  }

  redirect(withParams(`/devices/${deviceId}`, { alert: "created_from_telemetry" }));
}
