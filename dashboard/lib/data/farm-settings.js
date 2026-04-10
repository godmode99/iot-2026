import { isTemplateAvailableForFarm } from "@/lib/data/operational-records.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import {
  listAuditLog,
  listFarmMembers,
  listNotificationPreferences,
  listResellerAssignments
} from "@/lib/backend/farm-settings.js";

const EMPTY_FARM_SETTINGS = {
  farm: null,
  canManage: false,
  members: [],
  resellers: [],
  notificationPreferences: [],
  audit: [],
  summary: {
    devices: [],
    openAlerts: [],
    recentRecords: [],
    templates: [],
    expectations: [],
    telemetry: {
      history: [],
      latestByDevice: [],
      metrics: {
        reportingDeviceCount: 0,
        latestAverageTemperature: null,
        latestAverageBattery: null,
        lowBatteryDeviceCount: 0,
        lastReportedAt: null
      }
    },
    telemetryOutcomeTrends: {
      byOutcome: {
        alert_follow_up: 0,
        record_follow_up: 0,
        handoff_follow_up: 0
      },
      total: 0
    },
    telemetryOutcomeHistory: [],
    notificationCoverage: {
      memberRecipientCount: 0,
      preferenceCount: 0,
      emailEnabledCount: 0,
      lineEnabledCount: 0,
      criticalOnlyCount: 0,
      farmEmailConfigured: false,
      farmLineConfigured: false,
      hasCoverage: false,
      recipients: [],
      scenarios: []
    },
    metrics: {
      deviceCount: 0,
      openAlertCount: 0,
      criticalAlertCount: 0,
      recordCount: 0,
      templateCount: 0,
      healthyTemplateCount: 0,
      attentionTemplateCount: 0,
      resolvedExpectationCount: 0,
      bySource: {
        record: 0,
        telemetry: 0,
        expectation: 0,
        system: 0
      }
    }
  },
  errors: []
};

function normalizeAdminResult(name, payload, resultKey) {
  if (!payload?.ok) {
    return {
      data: [],
      error: payload?.code ? `${name}: ${payload.code}` : `${name}: unavailable`
    };
  }

  return {
    data: payload.result?.[resultKey] ?? [],
    error: null
  };
}

function buildTelemetryOutcomeSummary(audit = []) {
  const history = audit
    .filter((entry) => entry.action === "ops.telemetry_follow_up_completed")
    .map((entry) => ({
      id: entry.id,
      outcome: entry.details_json?.outcome ?? "",
      summary: entry.details_json?.summary ?? entry.details_json?.context?.summary ?? "",
      created_at: entry.created_at ?? null
    }))
    .slice(0, 5);

  const byOutcome = {
    alert_follow_up: 0,
    record_follow_up: 0,
    handoff_follow_up: 0
  };

  for (const item of history) {
    if (item.outcome in byOutcome) {
      byOutcome[item.outcome] += 1;
    }
  }

  return {
    byOutcome,
    total: history.length,
    history
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
  const diffMs = now.getTime() - target.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function buildTemplateExpectations(templates = [], recentRecords = []) {
  return templates.map((template) => {
    const matchingRecords = recentRecords.filter((record) => record.record_templates?.code === template.code);
    const latestRecord = matchingRecords[0] ?? null;
    const latestRecordedFor = latestRecord?.recorded_for_date ?? latestRecord?.created_at ?? null;
    const latestAgeDays = daysSince(latestRecordedFor);
    const status = latestRecord && latestAgeDays !== null && latestAgeDays <= 7 ? "healthy" : "attention";

    return {
      template_id: template.id,
      template_name: template.name,
      template_code: template.code,
      field_count: template.field_count ?? 0,
      latest_record_id: latestRecord?.id ?? null,
      latest_recorded_for: latestRecordedFor,
      latest_record_status: latestRecord?.record_status ?? null,
      status
    };
  });
}

function average(values = []) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function startOfHourIso(value) {
  const date = toDateValue(value);
  if (!date) {
    return null;
  }

  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function buildFarmTelemetrySummary(devices = [], telemetryRows = []) {
  const latestByDeviceMap = new Map();
  const historyBuckets = new Map();

  for (const row of telemetryRows) {
    if (!latestByDeviceMap.has(row.device_id)) {
      latestByDeviceMap.set(row.device_id, row);
    }

    const bucketKey = startOfHourIso(row.recorded_at);
    if (!bucketKey) {
      continue;
    }

    const bucket = historyBuckets.get(bucketKey) ?? {
      bucket: bucketKey,
      temperatures: [],
      batteries: [],
      sample_count: 0
    };

    if (Number.isFinite(Number(row.temperature_c))) {
      bucket.temperatures.push(Number(row.temperature_c));
    }

    if (Number.isFinite(Number(row.battery_percent))) {
      bucket.batteries.push(Number(row.battery_percent));
    }

    bucket.sample_count += 1;
    historyBuckets.set(bucketKey, bucket);
  }

  const latestByDevice = devices
    .map((device) => {
      const latest = latestByDeviceMap.get(device.id) ?? null;
      return latest
        ? {
            device_id: device.id,
            device_label: device.serial_number ?? device.device_id,
            recorded_at: latest.recorded_at,
            temperature_c: latest.temperature_c,
            battery_percent: latest.battery_percent
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

  const latestTemperatures = latestByDevice
    .map((row) => Number(row.temperature_c))
    .filter((value) => Number.isFinite(value));
  const latestBatteries = latestByDevice
    .map((row) => Number(row.battery_percent))
    .filter((value) => Number.isFinite(value));
  const history = Array.from(historyBuckets.values())
    .map((bucket) => ({
      bucket: bucket.bucket,
      temperature_c: average(bucket.temperatures),
      battery_percent: average(bucket.batteries),
      sample_count: bucket.sample_count
    }))
    .sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime())
    .slice(-12);

  return {
    history,
    latestByDevice: latestByDevice.slice(0, 6),
    metrics: {
      reportingDeviceCount: latestByDevice.length,
      latestAverageTemperature: average(latestTemperatures),
      latestAverageBattery: average(latestBatteries),
      lowBatteryDeviceCount: latestBatteries.filter((value) => value <= 20).length,
      lastReportedAt: latestByDevice[0]?.recorded_at ?? null
    }
  };
}

function buildNotificationCoverage({ farm = null, members = [], preferences = [] }) {
  const preferenceByUserId = new Map(
    preferences
      .filter((item) => item?.user_id)
      .map((item) => [item.user_id, item])
  );

  const recipients = members
    .filter((member) => member?.can_receive_alerts)
    .map((member) => {
      const preference = preferenceByUserId.get(member.user_id) ?? null;
      return {
        user_id: member.user_id,
        email: member.email ?? "",
        display_name: member.display_name ?? "",
        role: member.role ?? "member",
        email_enabled: preference?.email_enabled ?? true,
        line_enabled: preference?.line_enabled ?? false,
        critical_only: preference?.critical_only ?? false,
        alert_types: preference?.alert_types ?? [],
        updated_at: preference?.updated_at ?? null
      };
    });

  const emailEnabledCount = recipients.filter((item) => item.email_enabled).length;
  const lineEnabledCount = recipients.filter((item) => item.line_enabled).length;
  const criticalOnlyCount = recipients.filter((item) => item.critical_only).length;
  const farmEmailConfigured = Boolean(farm?.alert_email_to);
  const farmLineConfigured = Boolean(farm?.alert_line_user_id);

  return {
    memberRecipientCount: recipients.length,
    preferenceCount: preferences.length,
    emailEnabledCount,
    lineEnabledCount,
    criticalOnlyCount,
    farmEmailConfigured,
    farmLineConfigured,
    hasCoverage: recipients.length > 0 || farmEmailConfigured || farmLineConfigured,
    recipients: recipients.slice(0, 8),
    scenarios: [
      buildNotificationScenario({
        key: "critical-threshold",
        label: "critical threshold",
        severity: "critical",
        preferenceType: "threshold",
        farm,
        members,
        preferences,
        preferenceByUserId
      }),
      buildNotificationScenario({
        key: "warning-threshold",
        label: "warning threshold",
        severity: "warning",
        preferenceType: "threshold",
        farm,
        members,
        preferences,
        preferenceByUserId
      })
    ]
  };
}

function buildNotificationScenario({
  key,
  label,
  severity,
  preferenceType,
  farm = null,
  members = [],
  preferences = [],
  preferenceByUserId = new Map()
}) {
  const recipients = members
    .filter((member) => member?.can_receive_alerts)
    .map((member) => {
      const preference = preferenceByUserId.get(member.user_id) ?? null;
      const allowedTypes = Array.isArray(preference?.alert_types) ? preference.alert_types : [];
      const blockedByCriticalOnly = Boolean(preference?.critical_only) && severity !== "critical";
      const blockedByType = allowedTypes.length > 0 && !allowedTypes.includes(preferenceType);
      const emailEnabled = preference?.email_enabled ?? true;
      const lineEnabled = preference?.line_enabled ?? false;
      const receivesThisAlert = !blockedByCriticalOnly && !blockedByType && (emailEnabled || lineEnabled);

      return {
        user_id: member.user_id,
        display_name: member.display_name ?? "",
        email: member.email ?? "",
        email_enabled: emailEnabled,
        line_enabled: lineEnabled,
        receivesThisAlert
      };
    })
    .filter((recipient) => recipient.receivesThisAlert);

  return {
    key,
    label,
    severity,
    preferenceType,
    personalRecipientCount: recipients.length,
    emailRecipientCount: recipients.filter((item) => item.email_enabled).length,
    lineRecipientCount: recipients.filter((item) => item.line_enabled).length,
    farmEmailConfigured: Boolean(farm?.alert_email_to),
    farmLineConfigured: Boolean(farm?.alert_line_user_id)
  };
}

export async function loadFarmSettings({ farmId, actorUserId }) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_FARM_SETTINGS;
  }

  const farmResult = await supabase
    .from("farms")
    .select("id,name,owner_user_id,alert_email_to,alert_line_user_id,created_at")
    .eq("id", farmId)
    .maybeSingle();

  if (farmResult.error || !farmResult.data) {
    return {
      ...EMPTY_FARM_SETTINGS,
      errors: farmResult.error ? [`farm: ${farmResult.error.message}`] : []
    };
  }

  const canManageResult = await supabase.rpc("can_manage_farm_settings", {
    target_farm_id: farmId
  });
  const canManage = canManageResult.data === true;
  const devicesResult = await supabase
    .from("devices")
    .select("id,device_id,serial_number,provisioning_state,device_status(online_state,last_seen_at,battery_percent)")
    .eq("farm_id", farmId)
    .order("device_id", { ascending: true })
    .limit(20);
  const telemetryResult = devicesResult.data?.length
    ? await supabase
        .from("telemetry")
        .select("id,device_id,recorded_at,temperature_c,battery_percent")
        .in("device_id", devicesResult.data.map((device) => device.id))
        .order("recorded_at", { ascending: false })
        .limit(120)
    : { data: [], error: null };

  const [
    alertsResult,
    expectationAlertsResult,
    resolvedExpectationAlertsResult,
    recordsResult,
    templatesResult,
    membersResult,
    resellersResult,
    preferencesResult,
    auditResult
  ] = await Promise.all([
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,opened_at,details_json,devices(device_id,serial_number)")
      .eq("farm_id", farmId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(12),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,opened_at,details_json")
      .eq("farm_id", farmId)
      .eq("status", "open")
      .eq("alert_type", "missing_record")
      .order("opened_at", { ascending: false })
      .limit(20),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,opened_at,resolved_at,details_json")
      .eq("farm_id", farmId)
      .eq("status", "resolved")
      .eq("alert_type", "missing_record")
      .gte("resolved_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("resolved_at", { ascending: false })
      .limit(20),
    supabase
      .from("operational_records")
      .select("id,record_status,recorded_for_date,notes_summary,created_at,record_templates(name,code),user_profiles(display_name)")
      .eq("farm_id", farmId)
      .order("recorded_for_date", { ascending: false })
      .limit(8),
    supabase
      .from("record_templates")
      .select("id,code,name,description,scope_type,is_active,record_template_farm_assignments(farm_id),record_template_fields(id)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(50),
    canManage ? listFarmMembers({ farmId, actorUserId }) : Promise.resolve(null),
    canManage ? listResellerAssignments({ farmId, actorUserId }) : Promise.resolve(null),
    canManage ? listNotificationPreferences({ farmId, actorUserId }) : Promise.resolve(null),
    canManage ? listAuditLog({ farmId, actorUserId }) : Promise.resolve(null)
  ]);

  const devices = {
    data: devicesResult.data ?? [],
    error: devicesResult.error ? `devices: ${devicesResult.error.message}` : null
  };
  const telemetry = {
    data: buildFarmTelemetrySummary(devices.data, telemetryResult.data ?? []),
    error: telemetryResult.error ? `telemetry: ${telemetryResult.error.message}` : null
  };
  const alerts = {
    data: (alertsResult.data ?? []).map((alert) => ({
      ...alert,
      source: alert?.details_json?.source ?? "system",
      devices: Array.isArray(alert.devices) ? alert.devices[0] ?? null : alert.devices ?? null
    })),
    error: alertsResult.error ? `alerts: ${alertsResult.error.message}` : null
  };
  const records = {
    data: (recordsResult.data ?? []).map((record) => ({
      ...record,
      record_templates: Array.isArray(record.record_templates) ? record.record_templates[0] ?? null : record.record_templates ?? null,
      user_profiles: Array.isArray(record.user_profiles) ? record.user_profiles[0] ?? null : record.user_profiles ?? null
    })),
    error: recordsResult.error ? `records: ${recordsResult.error.message}` : null
  };
  const expectationAlerts = {
    data: (expectationAlertsResult.data ?? []).map((alert) => ({
      ...alert,
      source_template_code: alert?.details_json?.source_template_code ?? null
    })),
    error: expectationAlertsResult.error ? `expectation_alerts: ${expectationAlertsResult.error.message}` : null
  };
  const resolvedExpectationAlerts = {
    data: resolvedExpectationAlertsResult.data ?? [],
    error: resolvedExpectationAlertsResult.error ? `resolved_expectation_alerts: ${resolvedExpectationAlertsResult.error.message}` : null
  };
  const templates = {
    data: (templatesResult.data ?? [])
      .map((template) => {
        const assignedFarmIds = Array.isArray(template.record_template_farm_assignments)
          ? template.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
          : [];

        return {
          ...template,
          assigned_farm_ids: assignedFarmIds,
          field_count: Array.isArray(template.record_template_fields) ? template.record_template_fields.length : 0
        };
      })
      .filter((template) => isTemplateAvailableForFarm(template, farmId)),
    error: templatesResult.error ? `templates: ${templatesResult.error.message}` : null
  };

  const members = canManage ? normalizeAdminResult("members", membersResult, "members") : { data: [], error: null };
  const resellers = canManage ? normalizeAdminResult("resellers", resellersResult, "assignments") : { data: [], error: null };
  const preferences = canManage ? normalizeAdminResult("notification_preferences", preferencesResult, "preferences") : { data: [], error: null };
  const audit = canManage ? normalizeAdminResult("audit", auditResult, "audit") : { data: [], error: null };
  const expectations = buildTemplateExpectations(templates.data, records.data).map((item) => {
    const existingAlert = expectationAlerts.data.find((alert) => alert.source_template_code === item.template_code) ?? null;
    return {
      ...item,
      existing_alert_id: existingAlert?.id ?? null
    };
  });
  const handoffHistory = audit.data
    .filter((entry) => entry.action === "ops.handoff_noted" && entry.details_json?.note)
    .slice(0, 5)
    .map((entry) => ({
      id: entry.id,
      note: entry.details_json?.note ?? "",
      created_at: entry.created_at ?? null
    }));
  const telemetryOutcomeSummary = buildTelemetryOutcomeSummary(audit.data);
  const notificationCoverage = buildNotificationCoverage({
    farm: farmResult.data,
    members: members.data,
    preferences: preferences.data
  });

  return {
    farm: farmResult.data,
    canManage,
    members: members.data,
    resellers: resellers.data,
    notificationPreferences: preferences.data,
    audit: audit.data,
    summary: {
      devices: devices.data,
      openAlerts: alerts.data,
      recentRecords: records.data,
      templates: templates.data,
      expectations,
      telemetry: telemetry.data,
      telemetryOutcomeTrends: {
        byOutcome: telemetryOutcomeSummary.byOutcome,
        total: telemetryOutcomeSummary.total
      },
      telemetryOutcomeHistory: telemetryOutcomeSummary.history,
      notificationCoverage,
      latestHandoff: handoffHistory[0] ?? null,
      handoffHistory,
      metrics: {
        deviceCount: devices.data.length,
        openAlertCount: alerts.data.length,
        criticalAlertCount: alerts.data.filter((alert) => alert.severity === "critical").length,
        recordCount: records.data.length,
        templateCount: templates.data.length,
        healthyTemplateCount: expectations.filter((item) => item.status === "healthy").length,
        attentionTemplateCount: expectations.filter((item) => item.status === "attention").length,
        resolvedExpectationCount: resolvedExpectationAlerts.data.length,
        bySource: {
          record: alerts.data.filter((alert) => alert.source === "record_detail").length,
          telemetry: alerts.data.filter((alert) => alert.source === "device_telemetry").length,
          expectation: alerts.data.filter((alert) => alert.source === "record_expectation").length,
          system: alerts.data.filter((alert) => !["record_detail", "device_telemetry", "record_expectation"].includes(alert.source)).length
        }
      }
    },
    errors: [canManageResult.error?.message, devices.error, telemetry.error, alerts.error, expectationAlerts.error, resolvedExpectationAlerts.error, records.error, templates.error, members.error, resellers.error, preferences.error, audit.error].filter(Boolean)
  };
}
