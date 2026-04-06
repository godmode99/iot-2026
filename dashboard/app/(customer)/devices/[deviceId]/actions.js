"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { queueDeviceCommand, updateAlertStatus } from "@/lib/backend/device-ops.js";

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
