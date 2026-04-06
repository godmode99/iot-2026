import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_OPS_OVERVIEW = {
  authorized: false,
  farms: [],
  devices: [],
  openAlerts: [],
  recentCommands: [],
  metrics: {
    farmCount: 0,
    deviceCount: 0,
    onlineCount: 0,
    attentionCount: 0,
    criticalAlertCount: 0
  },
  errors: []
};

function listResult(name, result) {
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

function mergeDeviceStatus(devices, statuses) {
  const byDeviceId = new Map(statuses.map((status) => [status.device_id, status]));
  return devices.map((device) => ({
    ...device,
    status: byDeviceId.get(device.id) ?? null
  }));
}

export async function loadOpsOverview() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_OPS_OVERVIEW;
  }

  const operatorResult = await supabase.rpc("is_admin_or_operator");
  const authorized = operatorResult.data === true;

  if (!authorized) {
    return {
      ...EMPTY_OPS_OVERVIEW,
      errors: operatorResult.error ? [`permissions: ${operatorResult.error.message}`] : []
    };
  }

  const [farmsResult, devicesResult, statusesResult, alertsResult, commandsResult] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,alert_email_to,alert_line_user_id,updated_at")
      .order("name", { ascending: true })
      .limit(50),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,battery_variant,firmware_version,farms(id,name)")
      .not("farm_id", "is", null)
      .order("device_id", { ascending: true })
      .limit(100),
    supabase
      .from("device_status")
      .select("device_id,last_seen_at,online_state,battery_percent,signal_quality")
      .order("last_seen_at", { ascending: false })
      .limit(100),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at,devices(device_id,serial_number)")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(30),
    supabase
      .from("command_log")
      .select("id,command_type,request_source,status,requested_at,completed_at,devices(device_id,serial_number)")
      .order("requested_at", { ascending: false })
      .limit(30)
  ]);

  const farms = listResult("farms", farmsResult);
  const devices = listResult("devices", devicesResult);
  const statuses = listResult("device_status", statusesResult);
  const alerts = listResult("alerts", alertsResult);
  const commands = listResult("command_log", commandsResult);
  const mergedDevices = mergeDeviceStatus(devices.data, statuses.data);
  const onlineCount = mergedDevices.filter((device) => device.status?.online_state === "online").length;
  const attentionCount = mergedDevices.filter((device) => ["stale", "offline"].includes(device.status?.online_state)).length;
  const criticalAlertCount = alerts.data.filter((alert) => alert.severity === "critical").length;

  return {
    authorized,
    farms: farms.data,
    devices: mergedDevices,
    openAlerts: alerts.data,
    recentCommands: commands.data,
    metrics: {
      farmCount: farms.data.length,
      deviceCount: mergedDevices.length,
      onlineCount,
      attentionCount,
      criticalAlertCount
    },
    errors: [farms.error, devices.error, statuses.error, alerts.error, commands.error].filter(Boolean)
  };
}
