import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_DEVICE_DETAIL = {
  device: null,
  status: null,
  history: [],
  alerts: [],
  commands: [],
  permissions: {
    canManageAlerts: false,
    canSendSafeCommand: false,
    canSendOtaApply: false
  },
  errors: []
};

function normalizeResult(name, result) {
  if (result.error) {
    return {
      data: null,
      error: `${name}: ${result.error.message}`
    };
  }

  return {
    data: result.data ?? null,
    error: null
  };
}

function normalizeList(name, result) {
  if (result.error) {
    return {
      data: [],
      error: `${name}: ${result.error.message}`
    };
  }

  return {
    data: result.data ?? [],
    error: null
  };
}

async function canSendCommand(supabase, farmId, commandType) {
  const result = await supabase.rpc("can_send_farm_command", {
    target_farm_id: farmId,
    command_type: commandType
  });

  return {
    data: result.data === true,
    error: result.error ? `permissions:${commandType}: ${result.error.message}` : null
  };
}

export async function loadDeviceDetail({ deviceId }) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_DEVICE_DETAIL;
  }

  const deviceResult = await supabase
    .from("devices")
    .select("id,device_id,serial_number,farm_id,provisioning_state,firmware_version,publish_interval_sec,battery_variant,battery_profile_version,usable_capacity_mah,created_at,farms(id,name)")
    .eq("device_id", deviceId)
    .maybeSingle();
  const device = normalizeResult("device", deviceResult);

  if (!device.data) {
    return {
      ...EMPTY_DEVICE_DETAIL,
      errors: device.error ? [device.error] : []
    };
  }

  const [statusResult, historyResult, alertsResult, commandsResult, manageAlertsResult, safeCommandResult, otaApplyResult] = await Promise.all([
    supabase
      .from("device_status")
      .select("device_id,last_seen_at,online_state,battery_percent,battery_mv,signal_quality,gps_fix_state,last_lat,last_lng,updated_at")
      .eq("device_id", device.data.id)
      .maybeSingle(),
    supabase
      .from("telemetry")
      .select("id,recorded_at,temperature_c,turbidity_raw,battery_percent,battery_mv,lat,lng")
      .eq("device_id", device.data.id)
      .order("recorded_at", { ascending: false })
      .limit(24),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,opened_at,resolved_at,details_json")
      .eq("device_id", device.data.id)
      .order("opened_at", { ascending: false })
      .limit(20),
    supabase
      .from("command_log")
      .select("id,command_type,request_source,status,requested_at,completed_at,details_json")
      .eq("device_id", device.data.id)
      .order("requested_at", { ascending: false })
      .limit(10),
    supabase.rpc("can_manage_farm_alerts", {
      target_farm_id: device.data.farm_id
    }),
    canSendCommand(supabase, device.data.farm_id, "reboot"),
    canSendCommand(supabase, device.data.farm_id, "ota_apply")
  ]);

  const status = normalizeResult("device_status", statusResult);
  const history = normalizeList("telemetry", historyResult);
  const alerts = normalizeList("alerts", alertsResult);
  const commands = normalizeList("command_log", commandsResult);

  return {
    device: device.data,
    status: status.data,
    history: history.data.slice().reverse(),
    alerts: alerts.data,
    commands: commands.data,
    permissions: {
      canManageAlerts: manageAlertsResult.data === true,
      canSendSafeCommand: safeCommandResult.data === true,
      canSendOtaApply: otaApplyResult.data === true
    },
    errors: [
      device.error,
      status.error,
      history.error,
      alerts.error,
      commands.error,
      manageAlertsResult.error ? `permissions:alerts: ${manageAlertsResult.error.message}` : null,
      safeCommandResult.error,
      otaApplyResult.error
    ].filter(Boolean)
  };
}
