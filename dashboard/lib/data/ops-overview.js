import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_OPS_OVERVIEW = {
  authorized: false,
  reportWindow: "30d",
  farms: [],
  devices: [],
  openAlerts: [],
  recentCommands: [],
  metrics: {
    farmCount: 0,
    deviceCount: 0,
    onlineCount: 0,
    attentionCount: 0,
    criticalAlertCount: 0,
    missingContactCount: 0,
    missingHandoffCount: 0,
    expectationRecoveredCount: 0
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
  expectationMetrics: {
    currentCount: 0,
    attentionCount: 0,
    recoveredCount: 0
  },
  expectationTrends: {
    byFarm: [],
    byTemplate: []
  },
  followUpQueue: [],
  reports: {
    disciplineByFarm: [],
    alertPressureByFarm: []
  },
  errors: []
};

function normalizeReportWindow(value) {
  if (value === "7d" || value === "90d") {
    return value;
  }

  return "30d";
}

function normalizeSeverityFilter(value) {
  return value === "critical" || value === "warning" ? value : "all";
}

function normalizeSourceFilter(value) {
  return value === "record" || value === "telemetry" || value === "expectation" || value === "system"
    ? value
    : "all";
}

function windowDays(windowValue) {
  if (windowValue === "7d") {
    return 7;
  }

  if (windowValue === "90d") {
    return 90;
  }

  return 30;
}

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

  return Math.floor((Date.now() - target.getTime()) / (1000 * 60 * 60 * 24));
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

function normalizeAlert(alert) {
  return {
    ...alert,
    source: alert?.details_json?.source ?? "system",
    sourceLabel: normalizeAlertSource(alert?.details_json?.source)
  };
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

function buildExpectationSummary({ farms = [], templates = [], records = [], resolvedAlerts = [] }) {
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
      const status = latestRecord && latestAgeDays !== null && latestAgeDays <= 7 ? "current" : "attention";

      return {
        templateCode: template.code,
        templateName: template.name,
        status
      };
    });

    return {
      farmId: farm.id,
      farmName: farm.name,
      currentCount: expectations.filter((item) => item.status === "current").length,
      attentionCount: expectations.filter((item) => item.status === "attention").length
    };
  });

  return {
    currentCount: farmSummaries.reduce((sum, farm) => sum + farm.currentCount, 0),
    attentionCount: farmSummaries.reduce((sum, farm) => sum + farm.attentionCount, 0),
    recoveredCount: resolvedAlerts.length
  };
}

function buildExpectationTrends({ alerts = [], farms = [] }) {
  const farmNameMap = new Map(farms.map((farm) => [farm.id, farm.name]));

  const byFarm = Object.values(
    alerts.reduce((accumulator, alert) => {
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
    .slice(0, 6);

  const byTemplate = Object.values(
    alerts.reduce((accumulator, alert) => {
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
    .slice(0, 6);

  return {
    byFarm,
    byTemplate
  };
}

function buildReportRows({
  farms = [],
  devices = [],
  openAlerts = [],
  templates = [],
  records = [],
  expectationHistory = [],
  resolvedExpectationAlerts = [],
  latestHandoffByFarmId = new Map(),
  reportWindowDays = 30
}) {
  const rows = farms.map((farm) => {
    const farmDevices = devices.filter((device) => device.farm_id === farm.id);
    const farmAlerts = openAlerts.filter((alert) => alert.farm_id === farm.id);
    const farmRecords = records.filter((record) => record.farm_id === farm.id);
    const farmTemplates = templates.filter((template) => isTemplateAvailableForFarm(template, farm.id));
    const farmExpectationAlerts = expectationHistory.filter((alert) => alert.farm_id === farm.id);
    const farmRecoveredExpectationAlerts = resolvedExpectationAlerts.filter((alert) => {
      const templateCode = alert.details_json?.source_template_code;
      return farmTemplates.some((template) => template.code === templateCode);
    });
    const currentTemplateCount = farmTemplates.filter((template) => {
      const matchingRecords = farmRecords.filter((record) => {
        const recordTemplate = Array.isArray(record.record_templates) ? record.record_templates[0] ?? null : record.record_templates ?? null;
        const latestRecordedFor = record?.recorded_for_date ?? record?.created_at ?? null;
        return recordTemplate?.code === template.code && daysSince(latestRecordedFor) !== null && daysSince(latestRecordedFor) <= 7;
      });

      return matchingRecords.length > 0;
    }).length;

    return {
      farmId: farm.id,
      farmName: farm.name,
      activeTemplates: farmTemplates.length,
      currentTemplates: currentTemplateCount,
      attentionTemplates: Math.max(farmTemplates.length - currentTemplateCount, 0),
      recordsInWindow: farmRecords.filter((record) => {
        const target = toDateValue(record.recorded_for_date ?? record.created_at);
        return target ? target.getTime() >= Date.now() - reportWindowDays * 24 * 60 * 60 * 1000 : false;
      }).length,
      expectationAlertsInWindow: farmExpectationAlerts.length,
      expectationRecoveredLast7Days: farmRecoveredExpectationAlerts.length,
      devicesTotal: farmDevices.length,
      devicesNeedingAttention: farmDevices.filter((device) => ["stale", "offline"].includes(device.status?.online_state)).length,
      openAlerts: farmAlerts.length,
      criticalAlerts: farmAlerts.filter((alert) => alert.severity === "critical").length,
      recordAlerts: farmAlerts.filter((alert) => alert.sourceLabel === "record").length,
      telemetryAlerts: farmAlerts.filter((alert) => alert.sourceLabel === "telemetry").length,
      expectationAlertsOpen: farmAlerts.filter((alert) => alert.sourceLabel === "expectation").length,
      systemAlerts: farmAlerts.filter((alert) => alert.sourceLabel === "system").length,
      hasHandoff: Boolean(latestHandoffByFarmId.get(farm.id)?.note),
      latestHandoff: latestHandoffByFarmId.get(farm.id)?.note ?? "",
      latestHandoffAt: latestHandoffByFarmId.get(farm.id)?.created_at ?? ""
    };
  });

  return {
    disciplineByFarm: [...rows]
      .sort((left, right) => {
        if (Number(left.hasHandoff) !== Number(right.hasHandoff)) {
          return Number(left.hasHandoff) - Number(right.hasHandoff);
        }
        if (right.attentionTemplates !== left.attentionTemplates) {
          return right.attentionTemplates - left.attentionTemplates;
        }
        return right.expectationAlertsInWindow - left.expectationAlertsInWindow;
      }),
    alertPressureByFarm: [...rows]
      .sort((left, right) => {
        if (Number(left.hasHandoff) !== Number(right.hasHandoff)) {
          return Number(left.hasHandoff) - Number(right.hasHandoff);
        }
        if (right.openAlerts !== left.openAlerts) {
          return right.openAlerts - left.openAlerts;
        }
        return right.criticalAlerts - left.criticalAlerts;
      })
  };
}

function buildFollowUpQueue({ farms = [], reportRows = { disciplineByFarm: [], alertPressureByFarm: [] } }) {
  const farmById = new Map(farms.map((farm) => [farm.id, farm]));
  const pressureByFarmId = new Map(reportRows.alertPressureByFarm.map((row) => [row.farmId, row]));
  const disciplineByFarmId = new Map(reportRows.disciplineByFarm.map((row) => [row.farmId, row]));
  const items = [];

  for (const [farmId, alertRow] of pressureByFarmId.entries()) {
    const farm = farmById.get(farmId);
    const disciplineRow = disciplineByFarmId.get(farmId);
    const farmName = farm?.name ?? alertRow.farmName ?? "Unknown farm";

    if ((alertRow.criticalAlerts ?? 0) > 0) {
      items.push({
        key: `${farmId}-critical-alerts`,
        category: "critical-alerts",
        farmId,
        farmName,
        priority: "critical",
        priorityScore: 1000 + (alertRow.criticalAlerts ?? 0) * 10 + (alertRow.openAlerts ?? 0),
        title: `Critical alerts need review at ${farmName}`,
        body: `${alertRow.criticalAlerts} critical and ${alertRow.openAlerts} open alerts are still active for this farm.`,
        primaryHref: `/alerts?farmId=${farmId}&severity=critical&return_to=${encodeURIComponent("/ops")}`,
        primaryLabel: "Review critical alerts",
        secondaryHref: `/ops/reports/farms/${farmId}`,
        secondaryLabel: "Open farm report"
      });
    }

    if ((alertRow.devicesNeedingAttention ?? 0) > 0) {
      items.push({
        key: `${farmId}-device-attention`,
        category: "device-attention",
        farmId,
        farmName,
        priority: "warning",
        priorityScore: 700 + (alertRow.devicesNeedingAttention ?? 0) * 5,
        title: `Device attention is building at ${farmName}`,
        body: `${alertRow.devicesNeedingAttention} devices look stale or offline and should be checked against the current alert queue.`,
        primaryHref: `/ops/reports/farms/${farmId}`,
        primaryLabel: "Review device pressure",
        secondaryHref: `/alerts?farmId=${farmId}&return_to=${encodeURIComponent("/ops")}`,
        secondaryLabel: "Open alerts"
      });
    }

    if ((disciplineRow?.attentionTemplates ?? 0) > 0) {
      items.push({
        key: `${farmId}-record-discipline`,
        category: "record-discipline",
        farmId,
        farmName,
        priority: (disciplineRow?.expectationAlertsInWindow ?? 0) > 0 ? "warning" : "attention",
        priorityScore: 500 + (disciplineRow?.attentionTemplates ?? 0) * 5 + (disciplineRow?.expectationAlertsInWindow ?? 0),
        title: `Record discipline needs follow-up at ${farmName}`,
        body: `${disciplineRow?.attentionTemplates ?? 0} templates need attention and ${disciplineRow?.expectationAlertsInWindow ?? 0} missing-record alerts were seen in the current reporting window.`,
        primaryHref: `/records?farm=${farmId}&dateRange=30d&return_to=${encodeURIComponent("/ops")}`,
        primaryLabel: "Open records",
        secondaryHref: `/ops/reports/farms/${farmId}`,
        secondaryLabel: "Open farm report"
      });
    }

    if (farm && !farm.alert_email_to && !farm.alert_line_user_id) {
      items.push({
        key: `${farmId}-contact-gap`,
        category: "contact-gap",
        farmId,
        farmName,
        priority: "attention",
        priorityScore: 300,
        title: `Notification contacts are missing at ${farmName}`,
        body: "This farm still has no alert email or LINE contact configured, so escalations may not reach the team reliably.",
        primaryHref: `/farms/${farmId}`,
        primaryLabel: "Update farm contacts",
        secondaryHref: `/ops/reports/farms/${farmId}`,
        secondaryLabel: "Open farm report"
      });
    }
  }

  return items
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 10);
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }
  return stringValue;
}

export function toOpsCsv(rows = []) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ];

  return lines.join("\n");
}

function emptyOpsFarmReport(reportWindow = "30d") {
  return {
    authorized: false,
    reportWindow,
    farm: null,
    metrics: {
      activeTemplates: 0,
      currentTemplates: 0,
      attentionTemplates: 0,
      recordsInWindow: 0,
      expectationAlertsInWindow: 0,
      expectationRecoveredLast7Days: 0,
      devicesTotal: 0,
      devicesNeedingAttention: 0,
      openAlerts: 0,
      criticalAlerts: 0
    },
    openAlerts: [],
    recentRecords: [],
    topExpectationTemplates: [],
    latestHandoff: null,
    handoffHistory: [],
    errors: []
  };
}

export async function loadOpsFarmReport({ farmId, reportWindow = "30d", severityFilter = "all", sourceFilter = "all" } = {}) {
  const supabase = await createSupabaseServerClient();
  const normalizedWindow = normalizeReportWindow(reportWindow);
  const normalizedSeverityFilter = normalizeSeverityFilter(severityFilter);
  const normalizedSourceFilter = normalizeSourceFilter(sourceFilter);
  const reportWindowDays = windowDays(normalizedWindow);

  if (!supabase) {
    return emptyOpsFarmReport(normalizedWindow);
  }

  const operatorResult = await supabase.rpc("is_admin_or_operator");
  const authorized = operatorResult.data === true;

  if (!authorized) {
    return {
      ...emptyOpsFarmReport(normalizedWindow),
      errors: operatorResult.error ? [`permissions: ${operatorResult.error.message}`] : []
    };
  }

  const lastWindowIso = new Date(Date.now() - reportWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const last7DaysIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    farmResult,
    devicesResult,
    statusesResult,
    alertsResult,
    recordsResult,
    templatesResult,
    expectationHistoryResult,
    resolvedExpectationAlertsResult,
    handoffNotesResult
  ] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,alert_email_to,alert_line_user_id,updated_at,created_at")
      .eq("id", farmId)
      .maybeSingle(),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,farms(id,name)")
      .eq("farm_id", farmId)
      .order("device_id", { ascending: true }),
    supabase
      .from("device_status")
      .select("device_id,last_seen_at,online_state,battery_percent,signal_quality")
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at,details_json,devices(device_id,serial_number)")
      .eq("farm_id", farmId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(50),
    supabase
      .from("operational_records")
      .select("id,farm_id,record_status,recorded_for_date,notes_summary,created_at,record_templates(code,name),user_profiles(display_name)")
      .eq("farm_id", farmId)
      .order("recorded_for_date", { ascending: false })
      .limit(80),
    supabase
      .from("record_templates")
      .select("id,code,name,scope_type,is_active,record_template_farm_assignments(farm_id)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("alerts")
      .select("id,alert_type,status,farm_id,opened_at,details_json")
      .eq("farm_id", farmId)
      .eq("alert_type", "missing_record")
      .gte("opened_at", lastWindowIso)
      .order("opened_at", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,status,resolved_at,details_json")
      .eq("status", "resolved")
      .eq("alert_type", "missing_record")
      .gte("resolved_at", last7DaysIso)
      .order("resolved_at", { ascending: false })
      .limit(80),
    supabase
      .from("audit_log")
      .select("id,farm_id,details_json,created_at")
      .eq("farm_id", farmId)
      .eq("action", "ops.handoff_noted")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  const farm = farmResult.error
    ? { data: null, error: `farm: ${farmResult.error.message}` }
    : { data: farmResult.data ?? null, error: null };
  const devices = listResult("devices", devicesResult);
  const statuses = listResult("device_status", statusesResult);
  const alerts = listResult("alerts", alertsResult);
  const records = listResult("operational_records", recordsResult);
  const templates = listResult("record_templates", templatesResult);
  const expectationHistory = listResult("expectation_history", expectationHistoryResult);
  const resolvedExpectationAlerts = listResult("resolved_expectation_alerts", resolvedExpectationAlertsResult);
  const handoffNotes = listResult("handoff_notes", handoffNotesResult);

  const mergedDevices = mergeDeviceStatus(
    devices.data,
    statuses.data.filter((status) => devices.data.some((device) => device.id === status.device_id))
  );
  const normalizedAlerts = alerts.data.map(normalizeAlert);
  const filteredAlerts = normalizedAlerts.filter((alert) => {
    if (normalizedSeverityFilter !== "all" && alert.severity !== normalizedSeverityFilter) {
      return false;
    }

    if (normalizedSourceFilter !== "all" && alert.sourceLabel !== normalizedSourceFilter) {
      return false;
    }

    return true;
  });
  const normalizedTemplates = templates.data.map((template) => ({
    ...template,
    assigned_farm_ids: Array.isArray(template.record_template_farm_assignments)
      ? template.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
      : []
  }));
  const visibleTemplates = normalizedTemplates.filter((template) => isTemplateAvailableForFarm(template, farmId));
  const reportRows = buildReportRows({
    farms: farm.data ? [farm.data] : [],
    devices: mergedDevices,
    openAlerts: normalizedAlerts,
    templates: visibleTemplates,
    records: records.data,
    expectationHistory: expectationHistory.data,
    resolvedExpectationAlerts: resolvedExpectationAlerts.data,
    reportWindowDays
  });
  const summary = reportRows.disciplineByFarm[0] ?? {
    activeTemplates: 0,
    currentTemplates: 0,
    attentionTemplates: 0,
    recordsInWindow: 0,
    expectationAlertsInWindow: 0,
    expectationRecoveredLast7Days: 0,
    devicesTotal: 0,
    devicesNeedingAttention: 0,
    openAlerts: 0,
    criticalAlerts: 0
  };
  const templateIdByCode = new Map(visibleTemplates.map((template) => [template.code, template.id]));
  const topExpectationTemplates = Object.values(
    expectationHistory.data.reduce((accumulator, alert) => {
      const templateCode = alert.details_json?.source_template_code ?? "unknown_template";
      const templateName = alert.details_json?.source_template_name ?? templateCode;
      const current = accumulator[templateCode] ?? {
        templateCode,
        templateName,
        templateId: templateIdByCode.get(templateCode) ?? null,
        count: 0
      };
      current.count += 1;
      accumulator[templateCode] = current;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
  const normalizedHandoffHistory = handoffNotes.data.map((note) => ({
    id: note.id,
    note: note.details_json?.note ?? "",
    created_at: note.created_at ?? null
  }));

  return {
    authorized,
    reportWindow: normalizedWindow,
    severityFilter: normalizedSeverityFilter,
    sourceFilter: normalizedSourceFilter,
    farm: farm.data,
    metrics: summary,
    openAlerts: filteredAlerts,
    recentRecords: records.data.slice(0, 20),
    topExpectationTemplates,
    latestHandoff: normalizedHandoffHistory[0] ?? null,
    handoffHistory: normalizedHandoffHistory.slice(0, 5),
    errors: [
      farm.error,
      devices.error,
      statuses.error,
      alerts.error,
      records.error,
      templates.error,
      expectationHistory.error,
      resolvedExpectationAlerts.error,
      handoffNotes.error
    ].filter(Boolean)
  };
}

export async function loadOpsOverview(options = {}) {
  const supabase = await createSupabaseServerClient();
  const reportWindow = normalizeReportWindow(options.reportWindow);
  const severityFilter = normalizeSeverityFilter(options.severityFilter);
  const sourceFilter = normalizeSourceFilter(options.sourceFilter);
  const reportWindowDays = windowDays(reportWindow);

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

  const lastWindowIso = new Date(Date.now() - reportWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const last7DaysIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    farmsResult,
    devicesResult,
    statusesResult,
    alertsResult,
    commandsResult,
    templatesResult,
    recordsResult,
    expectationHistoryResult,
    resolvedExpectationAlertsResult,
    handoffNotesResult
  ] = await Promise.all([
    supabase
      .from("farms")
      .select("id,name,alert_email_to,alert_line_user_id,updated_at")
      .order("name", { ascending: true })
      .limit(80),
    supabase
      .from("devices")
      .select("id,device_id,serial_number,farm_id,battery_variant,firmware_version,farms(id,name)")
      .not("farm_id", "is", null)
      .order("device_id", { ascending: true })
      .limit(150),
    supabase
      .from("device_status")
      .select("device_id,last_seen_at,online_state,battery_percent,signal_quality")
      .order("last_seen_at", { ascending: false })
      .limit(150),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,farm_id,device_id,opened_at,details_json,devices(device_id,serial_number)")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(60),
    supabase
      .from("command_log")
      .select("id,command_type,request_source,status,requested_at,completed_at,devices(device_id,serial_number)")
      .order("requested_at", { ascending: false })
      .limit(40),
    supabase
      .from("record_templates")
      .select("id,code,name,scope_type,is_active,record_template_farm_assignments(farm_id)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("operational_records")
      .select("id,farm_id,recorded_for_date,created_at,record_templates(code,name)")
      .order("recorded_for_date", { ascending: false })
      .limit(200),
    supabase
      .from("alerts")
      .select("id,alert_type,status,farm_id,opened_at,details_json")
      .eq("alert_type", "missing_record")
      .gte("opened_at", lastWindowIso)
      .order("opened_at", { ascending: false })
      .limit(300),
    supabase
      .from("alerts")
      .select("id,alert_type,status,resolved_at,details_json")
      .eq("status", "resolved")
      .eq("alert_type", "missing_record")
      .gte("resolved_at", last7DaysIso)
      .order("resolved_at", { ascending: false })
      .limit(80),
    supabase
      .from("audit_log")
      .select("id,farm_id,details_json,created_at")
      .eq("action", "ops.handoff_noted")
      .order("created_at", { ascending: false })
      .limit(120)
  ]);

  const farms = listResult("farms", farmsResult);
  const devices = listResult("devices", devicesResult);
  const statuses = listResult("device_status", statusesResult);
  const alerts = listResult("alerts", alertsResult);
  const commands = listResult("command_log", commandsResult);
  const templates = listResult("record_templates", templatesResult);
  const records = listResult("operational_records", recordsResult);
  const expectationHistory = listResult("expectation_history", expectationHistoryResult);
  const resolvedExpectationAlerts = listResult("resolved_expectation_alerts", resolvedExpectationAlertsResult);
  const handoffNotes = listResult("handoff_notes", handoffNotesResult);

  const mergedDevices = mergeDeviceStatus(devices.data, statuses.data);
  const normalizedAlerts = alerts.data.map(normalizeAlert);
  const filteredAlerts = normalizedAlerts.filter((alert) => {
    if (severityFilter !== "all" && alert.severity !== severityFilter) {
      return false;
    }

    if (sourceFilter !== "all" && alert.sourceLabel !== sourceFilter) {
      return false;
    }

    return true;
  });
  const normalizedTemplates = templates.data.map((template) => ({
    ...template,
    assigned_farm_ids: Array.isArray(template.record_template_farm_assignments)
      ? template.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
      : []
  }));

  const onlineCount = mergedDevices.filter((device) => device.status?.online_state === "online").length;
  const attentionCount = mergedDevices.filter((device) => ["stale", "offline"].includes(device.status?.online_state)).length;
  const criticalAlertCount = normalizedAlerts.filter((alert) => alert.severity === "critical").length;
  const missingContactCount = farms.data.filter((farm) => !farm.alert_email_to && !farm.alert_line_user_id).length;
  const expectationMetrics = buildExpectationSummary({
    farms: farms.data,
    templates: normalizedTemplates,
    records: records.data,
    resolvedAlerts: resolvedExpectationAlerts.data
  });
  const expectationTrends = buildExpectationTrends({
    alerts: expectationHistory.data,
    farms: farms.data
  });
  const latestHandoffByFarmId = new Map();
  for (const note of handoffNotes.data) {
    if (!note?.farm_id || latestHandoffByFarmId.has(note.farm_id)) {
      continue;
    }

    latestHandoffByFarmId.set(note.farm_id, {
      id: note.id,
      note: note.details_json?.note ?? "",
      created_at: note.created_at ?? null
    });
  }
  const reports = buildReportRows({
    farms: farms.data,
    devices: mergedDevices,
    openAlerts: filteredAlerts,
    templates: normalizedTemplates,
    records: records.data,
    expectationHistory: expectationHistory.data,
    resolvedExpectationAlerts: resolvedExpectationAlerts.data,
    latestHandoffByFarmId,
    reportWindowDays
  });
  const handoffHistoryByFarmId = new Map();
  for (const note of handoffNotes.data) {
    if (!note?.farm_id) {
      continue;
    }

    const normalizedNote = {
      id: note.id,
      note: note.details_json?.note ?? "",
      created_at: note.created_at ?? null
    };

    if (!latestHandoffByFarmId.has(note.farm_id)) {
      latestHandoffByFarmId.set(note.farm_id, normalizedNote);
    }

    const existingHistory = handoffHistoryByFarmId.get(note.farm_id) ?? [];
    if (existingHistory.length < 5) {
      existingHistory.push(normalizedNote);
      handoffHistoryByFarmId.set(note.farm_id, existingHistory);
    }
  }

  const followUpQueue = buildFollowUpQueue({
    farms: farms.data,
    reportRows: reports
  }).map((item) => ({
    ...item,
    latestHandoff: latestHandoffByFarmId.get(item.farmId) ?? null,
    handoffHistory: handoffHistoryByFarmId.get(item.farmId) ?? []
  }));

  return {
    authorized,
    reportWindow,
    severityFilter,
    sourceFilter,
    farms: farms.data,
    devices: mergedDevices,
    openAlerts: filteredAlerts,
    recentCommands: commands.data,
    metrics: {
      farmCount: farms.data.length,
      deviceCount: mergedDevices.length,
      onlineCount,
      attentionCount,
      criticalAlertCount,
      missingContactCount,
      missingHandoffCount: Math.max(farms.data.length - latestHandoffByFarmId.size, 0),
      expectationRecoveredCount: resolvedExpectationAlerts.data.length
    },
    alertMetrics: {
      bySource: {
        record: filteredAlerts.filter((alert) => alert.sourceLabel === "record").length,
        telemetry: filteredAlerts.filter((alert) => alert.sourceLabel === "telemetry").length,
        expectation: filteredAlerts.filter((alert) => alert.sourceLabel === "expectation").length,
        system: filteredAlerts.filter((alert) => alert.sourceLabel === "system").length
      },
      topTypes: Object.entries(
        filteredAlerts.reduce((accumulator, alert) => {
          accumulator[alert.alert_type] = (accumulator[alert.alert_type] ?? 0) + 1;
          return accumulator;
        }, {})
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6)
        .map(([alertType, count]) => ({ alertType, count }))
    },
    expectationMetrics,
    expectationTrends,
    followUpQueue,
    reports,
    errors: [
      farms.error,
      devices.error,
      statuses.error,
      alerts.error,
      commands.error,
      templates.error,
      records.error,
      expectationHistory.error,
      resolvedExpectationAlerts.error,
      handoffNotes.error
    ].filter(Boolean)
  };
}
