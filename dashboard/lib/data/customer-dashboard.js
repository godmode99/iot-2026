import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_DASHBOARD = {
  farms: [],
  devices: [],
  openAlerts: [],
  recentRecords: [],
  expectationSummary: {
    farmsNeedingAttention: [],
    healthyCount: 0,
    attentionCount: 0,
    recoveredCount: 0
  },
  expectationTrends: {
    byFarm: [],
    byTemplate: []
  },
  alertMetrics: {
    bySource: {
      record: 0,
      telemetry: 0,
      expectation: 0,
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

function normalizeAlertSource(value) {
  if (value === "record_detail") {
    return "record";
  }

  if (value === "device_telemetry") {
    return "telemetry";
  }

  if (value === "record_expectation") {
    return "expectation";
  }

  return "system";
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

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value) {
  const target = toDateValue(value);
  if (!target) {
    return null;
  }

  const now = new Date();
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function isTemplateAvailableForFarm(template, farmId) {
  if (!template || template.is_active === false) {
    return false;
  }

  if (template.scope_type === "organization") {
    return false;
  }

  if (template.scope_type !== "farm") {
    return true;
  }

  const assignedFarmIds = template.assigned_farm_ids ?? [];
  if (!assignedFarmIds.length) {
    return true;
  }

  return assignedFarmIds.includes(farmId);
}

function buildExpectationSummary({ farms = [], templates = [], records = [] }) {
  const farmSummaries = farms.map((farm) => {
    const availableTemplates = templates.filter((template) => isTemplateAvailableForFarm(template, farm.id));
    const farmRecords = records.filter((record) => record.farm_id === farm.id);
    const expectations = availableTemplates.map((template) => {
      const matchingRecords = farmRecords.filter((record) => {
        const recordTemplate = Array.isArray(record.record_templates) ? record.record_templates[0] ?? null : record.record_templates ?? null;
        return recordTemplate?.code === template.code;
      });
      const latestRecord = matchingRecords[0] ?? null;
      const latestRecordedFor = latestRecord?.recorded_for_date ?? latestRecord?.created_at ?? null;
      const latestAgeDays = daysSince(latestRecordedFor);
      const status = latestRecord && latestAgeDays !== null && latestAgeDays <= 7 ? "healthy" : "attention";

      return {
        templateName: template.name,
        templateCode: template.code,
        latestRecordId: latestRecord?.id ?? null,
        latestRecordedFor,
        status
      };
    });

    return {
      farmId: farm.id,
      farmName: farm.name,
      healthyCount: expectations.filter((item) => item.status === "healthy").length,
      attentionCount: expectations.filter((item) => item.status === "attention").length,
      expectations
    };
  });

  return {
    farmsNeedingAttention: farmSummaries
      .filter((farm) => farm.attentionCount > 0)
      .sort((left, right) => right.attentionCount - left.attentionCount)
      .slice(0, 6),
    healthyCount: farmSummaries.reduce((sum, farm) => sum + farm.healthyCount, 0),
    attentionCount: farmSummaries.reduce((sum, farm) => sum + farm.attentionCount, 0)
  };
}

function buildExpectationTrends({ alerts = [], farms = [] }) {
  const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentAlerts = alerts.filter((alert) => {
    if (alert.alert_type !== "missing_record") {
      return false;
    }
    const openedAt = toDateValue(alert.opened_at);
    return openedAt ? openedAt.getTime() >= last30Days : false;
  });

  const farmNameMap = new Map(farms.map((farm) => [farm.id, farm.name]));

  const byFarm = Object.values(
    recentAlerts.reduce((accumulator, alert) => {
      const farmId = alert.farm_id ?? "unknown";
      const key = String(farmId);
      const current = accumulator[key] ?? {
        farmId,
        farmName: farmNameMap.get(farmId) ?? "Unknown farm",
        count: 0
      };
      current.count += 1;
      accumulator[key] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const byTemplate = Object.values(
    recentAlerts.reduce((accumulator, alert) => {
      const templateCode = alert.details_json?.source_template_code ?? "unknown_template";
      const templateName = alert.details_json?.source_template_name ?? templateCode;
      const current = accumulator[templateCode] ?? {
        templateCode,
        templateName,
        count: 0
      };
      current.count += 1;
      accumulator[templateCode] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return {
    byFarm,
    byTemplate
  };
}

export async function loadCustomerDashboard() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_DASHBOARD;
  }

  const [farmsResult, devicesResult, alertsResult, expectationHistoryResult, resolvedExpectationAlertsResult, recordsResult, templatesResult] = await Promise.all([
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
      .from("alerts")
      .select("id,alert_type,status,farm_id,opened_at,details_json")
      .eq("alert_type", "missing_record")
      .gte("opened_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("opened_at", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,status,resolved_at,details_json")
      .eq("status", "resolved")
      .eq("alert_type", "missing_record")
      .gte("resolved_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("resolved_at", { ascending: false })
      .limit(40),
    supabase
      .from("operational_records")
      .select("id,farm_id,record_status,recorded_for_date,notes_summary,created_at,record_templates(name,code),farms(id,name)")
      .order("recorded_for_date", { ascending: false })
      .limit(40),
    supabase
      .from("record_templates")
      .select("id,code,name,scope_type,is_active,record_template_farm_assignments(farm_id)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(50)
  ]);

  const farms = normalizeResult("farms", farmsResult);
  const devices = normalizeResult("devices", devicesResult);
  const openAlerts = normalizeResult("alerts", alertsResult);
  const expectationHistory = normalizeResult("expectation_history", expectationHistoryResult);
  const resolvedExpectationAlerts = normalizeResult("resolved_expectation_alerts", resolvedExpectationAlertsResult);
  const recentRecords = normalizeResult("operational_records", recordsResult);
  const templates = normalizeResult("record_templates", templatesResult);
  const normalizedOpenAlerts = openAlerts.data.map(normalizeAlert);
  const normalizedTemplates = templates.data.map((template) => ({
    ...template,
    assigned_farm_ids: Array.isArray(template.record_template_farm_assignments)
      ? template.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
      : []
  }));
  const expectationSummary = buildExpectationSummary({
    farms: farms.data,
    templates: normalizedTemplates,
    records: recentRecords.data
  });
  const expectationTrends = buildExpectationTrends({
    alerts: expectationHistory.data,
    farms: farms.data
  });

  return {
    farms: farms.data,
    devices: devices.data,
    openAlerts: normalizedOpenAlerts,
    recentRecords: recentRecords.data,
    expectationSummary: {
      ...expectationSummary,
      recoveredCount: resolvedExpectationAlerts.data.length
    },
    expectationTrends,
    alertMetrics: {
      bySource: {
        record: normalizedOpenAlerts.filter((alert) => alert.source === "record_detail").length,
        telemetry: normalizedOpenAlerts.filter((alert) => alert.source === "device_telemetry").length,
        expectation: normalizedOpenAlerts.filter((alert) => alert.source === "record_expectation").length,
        system: normalizedOpenAlerts.filter((alert) => !["record_detail", "device_telemetry", "record_expectation"].includes(alert.source)).length
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
    errors: [farms.error, devices.error, openAlerts.error, expectationHistory.error, resolvedExpectationAlerts.error, recentRecords.error, templates.error].filter(Boolean)
  };
}
