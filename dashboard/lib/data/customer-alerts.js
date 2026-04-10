import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_CUSTOMER_ALERTS = {
  alerts: [],
  farms: [],
  metrics: {
    total: 0,
    critical: 0,
    warning: 0,
    bySource: {
      record: 0,
      telemetry: 0,
      expectation: 0,
      system: 0
    },
    topTypes: []
  },
  filters: {
    farmId: "",
    severity: "",
    search: "",
    source: "",
    dateRange: "30d"
  },
  errors: []
};

const EMPTY_ALERT_DETAIL = {
  alert: null,
  device: null,
  farm: null,
  notificationPreview: {
    preferenceType: "threshold",
    farmEmailConfigured: false,
    farmLineConfigured: false,
    personalRecipientCount: 0,
    emailRecipientCount: 0,
    lineRecipientCount: 0,
    recipients: []
  },
  notificationDispatchAudit: {
    state: "ready",
    reason: "",
    recommendedAction: ""
  },
  alertTimeline: [],
  sourceRecord: null,
  sourceExpectation: null,
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
  const source = alert?.details_json?.source ?? "system";

  return {
    ...alert,
    source,
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
      alert.source,
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

function normalizeDateRange(value) {
  return ["7d", "30d", "90d", "all"].includes(value) ? value : "30d";
}

function dateRangeStart(dateRange) {
  if (dateRange === "all") {
    return null;
  }

  const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function normalizePreferenceAlertType(alert) {
  const rawType = String(alert?.alert_type ?? "").toLowerCase();
  if (rawType === "low_battery" || rawType.includes("battery")) {
    return "low_battery";
  }

  if (rawType === "sensor_fault" || rawType.includes("sensor")) {
    return "sensor_fault";
  }

  if (rawType === "offline" || rawType.includes("offline")) {
    return "offline";
  }

  return "threshold";
}

function buildAlertNotificationPreview({ alert, farm, members = [], preferences = [] }) {
  const preferenceType = normalizePreferenceAlertType(alert);
  const preferenceByUserId = new Map(
    preferences
      .filter((item) => item?.user_id)
      .map((item) => [item.user_id, item])
  );

  const recipients = members
    .filter((member) => member?.can_receive_alerts)
    .map((member) => {
      const preference = preferenceByUserId.get(member.user_id) ?? null;
      const allowedTypes = Array.isArray(preference?.alert_types) ? preference.alert_types : [];
      const blockedByCriticalOnly = Boolean(preference?.critical_only) && alert?.severity !== "critical";
      const blockedByType = allowedTypes.length > 0 && !allowedTypes.includes(preferenceType);
      const emailEnabled = preference?.email_enabled ?? true;
      const lineEnabled = preference?.line_enabled ?? false;
      const receivesThisAlert = !blockedByCriticalOnly && !blockedByType && (emailEnabled || lineEnabled);

      return {
        user_id: member.user_id,
        display_name: member.user_profiles?.display_name ?? "",
        role: member.role ?? "member",
        email_enabled: emailEnabled,
        line_enabled: lineEnabled,
        critical_only: preference?.critical_only ?? false,
        receivesThisAlert,
        blockedByCriticalOnly,
        blockedByType
      };
    })
    .filter((recipient) => recipient.receivesThisAlert);

  return {
    preferenceType,
    farmEmailConfigured: Boolean(farm?.alert_email_to),
    farmLineConfigured: Boolean(farm?.alert_line_user_id),
    personalRecipientCount: recipients.length,
    emailRecipientCount: recipients.filter((item) => item.email_enabled).length,
    lineRecipientCount: recipients.filter((item) => item.line_enabled).length,
    recipients
  };
}

function buildAlertDispatchAudit({ alert, preview, sourceExpectation }) {
  if (!preview?.farmEmailConfigured && !preview?.farmLineConfigured && (preview?.personalRecipientCount ?? 0) === 0) {
    return {
      state: "coverage-missing",
      reason: "This farm still has no fallback contact or matching personal recipient coverage for this alert.",
      recommendedAction: "Update delivery coverage first."
    };
  }

  if (alert?.source === "record_expectation" || sourceExpectation) {
    return {
      state: "follow-up-first",
      reason: "This alert comes from a missing expected record, so operational follow-up should happen before delivery review.",
      recommendedAction: "Review record discipline first."
    };
  }

  return {
    state: "ready",
    reason: "Delivery coverage is currently available for this alert, so it is ready for dispatch review.",
    recommendedAction: "Review alert delivery readiness."
  };
}

function buildAlertTimeline(alert) {
  if (!alert) {
    return [];
  }

  const timeline = [
    {
      key: `opened-${alert.id}`,
      type: "opened",
      title: "Alert opened",
      body: `${alert.alert_type} opened with ${alert.severity} severity.`,
      at: alert.opened_at ?? null
    }
  ];

  const adminActions = Array.isArray(alert?.details_json?.admin_actions)
    ? alert.details_json.admin_actions
    : [];

  for (const [index, action] of adminActions.entries()) {
    timeline.push({
      key: `admin-${index}-${action.action ?? "update"}`,
      type: action.action ?? "updated",
      title: `Alert ${action.action ?? "updated"}`,
      body: action.note ?? `Alert was ${action.action ?? "updated"} from the dashboard.`,
      at: action.at ?? null
    });
  }

  return timeline
    .filter((item) => item.at)
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}

export async function loadCustomerAlerts(filters = {}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_CUSTOMER_ALERTS;
  }

  const farmId = String(filters.farmId ?? "").trim();
  const severity = ["critical", "warning", "info"].includes(filters.severity) ? filters.severity : "";
  const search = String(filters.search ?? "").trim();
  const source = ["record_detail", "device_telemetry", "record_expectation", "system"].includes(filters.source)
    ? filters.source
    : "";
  const dateRange = normalizeDateRange(String(filters.dateRange ?? "").trim());

  let alertsQuery = supabase
    .from("alerts")
    .select("id,alert_type,severity,status,farm_id,device_id,opened_at,resolved_at,details_json,farms(id,name),devices(device_id,serial_number)")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(50);

  if (farmId) {
    alertsQuery = alertsQuery.eq("farm_id", farmId);
  }

  if (severity) {
    alertsQuery = alertsQuery.eq("severity", severity);
  }

  if (source) {
    alertsQuery = alertsQuery.eq("details_json->>source", source);
  }

  const startDate = dateRangeStart(dateRange);
  if (startDate) {
    alertsQuery = alertsQuery.gte("opened_at", startDate);
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
      warning: normalizedAlerts.filter((alert) => alert.severity === "warning").length,
      bySource: {
        record: normalizedAlerts.filter((alert) => alert.source === "record_detail").length,
        telemetry: normalizedAlerts.filter((alert) => alert.source === "device_telemetry").length,
        expectation: normalizedAlerts.filter((alert) => alert.source === "record_expectation").length,
        system: normalizedAlerts.filter((alert) => !["record_detail", "device_telemetry", "record_expectation"].includes(alert.source)).length
      },
      topTypes: Object.entries(
        normalizedAlerts.reduce((accumulator, alert) => {
          accumulator[alert.alert_type] = (accumulator[alert.alert_type] ?? 0) + 1;
          return accumulator;
        }, {})
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4)
        .map(([alertType, count]) => ({ alertType, count }))
    },
    filters: {
      farmId,
      severity,
      search,
      source,
      dateRange
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
    .select("id,alert_type,severity,status,farm_id,device_id,opened_at,resolved_at,details_json,farms(id,name,alert_email_to,alert_line_user_id),devices(id,device_id,serial_number)")
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
  let sourceRecord = null;
  let sourceExpectation = null;
  let notificationPreview = EMPTY_ALERT_DETAIL.notificationPreview;
  let notificationDispatchAudit = EMPTY_ALERT_DETAIL.notificationDispatchAudit;
  let recordsError = null;

  const sourceRecordId = normalizedAlert.details_json?.source_record_id;
  const sourceTemplateCode = normalizedAlert.details_json?.source_template_code ?? null;
  const sourceTemplateName = normalizedAlert.details_json?.source_template_name ?? null;
  const expectedWindowDays = normalizedAlert.details_json?.expected_window_days ?? null;

  if (sourceRecordId) {
    const sourceRecordResult = await supabase
      .from("operational_records")
      .select(`
        id,
        record_status,
        recorded_for_date,
        notes_summary,
        created_at,
        updated_at,
        record_templates(name,code),
        user_profiles(display_name),
        record_entries(
          id,
          field_key,
          label,
          value_text,
          value_number,
          value_boolean,
          unit,
          sort_order
        )
      `)
      .eq("id", sourceRecordId)
      .maybeSingle();

    if (sourceRecordResult.error) {
      recordsError = `source_record: ${sourceRecordResult.error.message}`;
    } else if (sourceRecordResult.data) {
      sourceRecord = {
        ...sourceRecordResult.data,
        record_templates: firstRelated(sourceRecordResult.data.record_templates),
        user_profiles: firstRelated(sourceRecordResult.data.user_profiles),
        record_entries: Array.isArray(sourceRecordResult.data.record_entries)
          ? [...sourceRecordResult.data.record_entries].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
          : []
      };
    }
  }

  if (!sourceRecord && normalizedAlert.source === "record_expectation") {
    sourceExpectation = {
      templateCode: sourceTemplateCode,
      templateName: sourceTemplateName,
      expectedWindowDays,
      note: normalizedAlert.details_json?.note ?? null
    };
  }

  if (normalizedAlert.farm_id) {
    const [recordsResult, membersResult, preferencesResult] = await Promise.all([
      supabase
        .from("operational_records")
        .select("id,record_status,recorded_for_date,notes_summary,created_at,record_templates(name,code),user_profiles(display_name)")
        .eq("farm_id", normalizedAlert.farm_id)
        .order("recorded_for_date", { ascending: false })
        .limit(6),
      supabase
        .from("farm_members")
        .select("user_id,role,can_receive_alerts,user_profiles(display_name)")
        .eq("farm_id", normalizedAlert.farm_id)
        .limit(40),
      supabase
        .from("notification_preferences")
        .select("user_id,email_enabled,line_enabled,critical_only,alert_types,updated_at")
        .eq("farm_id", normalizedAlert.farm_id)
        .limit(40)
    ]);

    if (recordsResult.error) {
      recordsError = `related_records: ${recordsResult.error.message}`;
    } else {
      relatedRecords = (recordsResult.data ?? []).map((record) => ({
        ...record,
        record_templates: firstRelated(record.record_templates),
        user_profiles: firstRelated(record.user_profiles)
      }));
    }

    notificationPreview = buildAlertNotificationPreview({
      alert: normalizedAlert,
      farm: normalizedAlert.farms ?? null,
      members: (membersResult.data ?? []).map((member) => ({
        ...member,
        user_profiles: firstRelated(member.user_profiles)
      })),
      preferences: preferencesResult.data ?? []
    });
    notificationDispatchAudit = buildAlertDispatchAudit({
      alert: normalizedAlert,
      preview: notificationPreview,
      sourceExpectation
    });

    if (membersResult.error) {
      recordsError = recordsError ?? `alert_delivery_members: ${membersResult.error.message}`;
    } else if (preferencesResult.error) {
      recordsError = recordsError ?? `alert_delivery_preferences: ${preferencesResult.error.message}`;
    }
  }

  return {
    alert: normalizedAlert,
    device: normalizedAlert.devices ?? null,
    farm: normalizedAlert.farms ?? null,
    notificationPreview,
    notificationDispatchAudit,
    alertTimeline: buildAlertTimeline(normalizedAlert),
    sourceRecord,
    sourceExpectation,
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
