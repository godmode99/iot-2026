import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_DASHBOARD = {
  farms: [],
  devices: [],
  openAlerts: [],
  errors: []
};

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

  const [farmsResult, devicesResult, alertsResult] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,provisioning_state,battery_variant")
      .not("farm_id", "is", null)
      .order("device_id", { ascending: true })
      .limit(50),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(20)
  ]);

  const farms = normalizeResult("farms", farmsResult);
  const devices = normalizeResult("devices", devicesResult);
  const openAlerts = normalizeResult("alerts", alertsResult);

  return {
    farms: farms.data,
    devices: devices.data,
    openAlerts: openAlerts.data,
    errors: [farms.error, devices.error, openAlerts.error].filter(Boolean)
  };
}

