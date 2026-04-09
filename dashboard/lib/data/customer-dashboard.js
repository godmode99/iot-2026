import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_DASHBOARD = {
  farms: [],
  devices: [],
  openAlerts: [],
  recentRecords: [],
  alertMetrics: {
    bySource: {
      record: 0,
      telemetry: 0,
      system: 0
    },
    topTypes: []
  },
  errors: []
};

function normalizeAlert(alert) {
  const source = alert?.details_json?.source ?? "system";

  return {
    ...alert,
    source
  };
}

function normalizeResult(name, result) {
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

export async function loadCustomerDashboard() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_DASHBOARD;
  }

  const [farmsResult, devicesResult, alertsResult, recordsResult] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,provisioning_state,battery_variant,device_status(online_state,last_seen_at,battery_percent,battery_mv,signal_quality,gps_fix_state)")
      .not("farm_id", "is", null)
      .order("device_id", { ascending: true })
      .limit(50),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at,details_json,devices(device_id,serial_number)")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(20),
    supabase
      .from("operational_records")
      .select("id,record_status,recorded_for_date,notes_summary,created_at,record_templates(name,code),farms(id,name)")
      .order("recorded_for_date", { ascending: false })
      .limit(10)
  ]);

  const farms = normalizeResult("farms", farmsResult);
  const devices = normalizeResult("devices", devicesResult);
  const openAlerts = normalizeResult("alerts", alertsResult);
  const recentRecords = normalizeResult("operational_records", recordsResult);
  const normalizedOpenAlerts = openAlerts.data.map(normalizeAlert);

  return {
    farms: farms.data,
    devices: devices.data,
    openAlerts: normalizedOpenAlerts,
    recentRecords: recentRecords.data,
    alertMetrics: {
      bySource: {
        record: normalizedOpenAlerts.filter((alert) => alert.source === "record_detail").length,
        telemetry: normalizedOpenAlerts.filter((alert) => alert.source === "device_telemetry").length,
        system: normalizedOpenAlerts.filter((alert) => !["record_detail", "device_telemetry"].includes(alert.source)).length
      },
      topTypes: Object.entries(
        normalizedOpenAlerts.reduce((accumulator, alert) => {
          accumulator[alert.alert_type] = (accumulator[alert.alert_type] ?? 0) + 1;
          return accumulator;
        }, {})
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4)
        .map(([alertType, count]) => ({ alertType, count }))
    },
    errors: [farms.error, devices.error, openAlerts.error, recentRecords.error].filter(Boolean)
  };
}
