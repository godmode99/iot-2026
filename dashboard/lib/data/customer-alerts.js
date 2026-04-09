import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_CUSTOMER_ALERTS = {
  alerts: [],
  farms: [],
  metrics: {
    total: 0,
    critical: 0,
    warning: 0
  },
  filters: {
    farmId: "",
    severity: "",
    search: ""
  },
  errors: []
};

const EMPTY_ALERT_DETAIL = {
  alert: null,
  device: null,
  farm: null,
  relatedRecords: [],
  permissions: {
    canManageAlerts: false
  },
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

function firstRelated(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeAlert(alert) {
  return {
    ...alert,
    farms: firstRelated(alert.farms),
    devices: firstRelated(alert.devices)
  };
}

function applyAlertSearch(alerts, search) {
  const normalizedSearch = String(search ?? "").trim().toLowerCase();
  if (!normalizedSearch) {
    return alerts;
  }

  return alerts.filter((alert) => {
    const haystack = [
      alert.alert_type,
      alert.severity,
      alert.farms?.name,
      alert.devices?.serial_number,
      alert.devices?.device_id
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export async function loadCustomerAlerts(filters = {}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_CUSTOMER_ALERTS;
  }

  const farmId = String(filters.farmId ?? "").trim();
  const severity = ["critical", "warning", "info"].includes(filters.severity) ? filters.severity : "";
  const search = String(filters.search ?? "").trim();

  let alertsQuery = supabase
    .from("alerts")
    .select("id,alert_type,severity,status,farm_id,device_id,opened_at,resolved_at,farms(id,name),devices(device_id,serial_number)")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(50);

  if (farmId) {
    alertsQuery = alertsQuery.eq("farm_id", farmId);
  }

  if (severity) {
    alertsQuery = alertsQuery.eq("severity", severity);
  }

  const [alertsResult, farmsResult] = await Promise.all([
    alertsQuery,
    supabase
      .from("farms")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const alerts = normalizeResult("alerts", alertsResult);
  const farms = normalizeResult("farms", farmsResult);
  const normalizedAlerts = applyAlertSearch(alerts.data.map(normalizeAlert), search);

  return {
    alerts: normalizedAlerts,
    farms: farms.data,
    metrics: {
      total: normalizedAlerts.length,
      critical: normalizedAlerts.filter((alert) => alert.severity === "critical").length,
      warning: normalizedAlerts.filter((alert) => alert.severity === "warning").length
    },
    filters: {
      farmId,
      severity,
      search
    },
    errors: [alerts.error, farms.error].filter(Boolean)
  };
}

export async function loadCustomerAlertDetail({ alertId }) {
  const safeAlertId = String(alertId ?? "").trim();
  if (!safeAlertId) {
    return {
      ...EMPTY_ALERT_DETAIL,
      errors: ["alert_detail: missing_alert_id"]
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_ALERT_DETAIL;
  }

  const alertResult = await supabase
    .from("alerts")
    .select("id,alert_type,severity,status,farm_id,device_id,opened_at,resolved_at,details_json,farms(id,name),devices(id,device_id,serial_number)")
    .eq("id", safeAlertId)
    .maybeSingle();

  const alert = normalizeResult("alert", alertResult);
  const normalizedAlert = normalizeAlert(alert.data);

  if (!normalizedAlert) {
    return {
      ...EMPTY_ALERT_DETAIL,
      errors: alert.error ? [alert.error] : []
    };
  }

  const permissionResult = await supabase.rpc("can_manage_farm_alerts", {
    target_farm_id: normalizedAlert.farm_id
  });

  let relatedRecords = [];
  let recordsError = null;

  if (normalizedAlert.farm_id) {
    const recordsResult = await supabase
      .from("operational_records")
      .select("id,record_status,recorded_for_date,notes_summary,created_at,record_templates(name,code),user_profiles(display_name)")
      .eq("farm_id", normalizedAlert.farm_id)
      .order("recorded_for_date", { ascending: false })
      .limit(6);

    if (recordsResult.error) {
      recordsError = `related_records: ${recordsResult.error.message}`;
    } else {
      relatedRecords = (recordsResult.data ?? []).map((record) => ({
        ...record,
        record_templates: firstRelated(record.record_templates),
        user_profiles: firstRelated(record.user_profiles)
      }));
    }
  }

  return {
    alert: normalizedAlert,
    device: normalizedAlert.devices ?? null,
    farm: normalizedAlert.farms ?? null,
    relatedRecords,
    permissions: {
      canManageAlerts: permissionResult.data === true
    },
    errors: [
      alert.error,
      permissionResult.error ? `permissions:alerts: ${permissionResult.error.message}` : null,
      recordsError
    ].filter(Boolean)
  };
}
