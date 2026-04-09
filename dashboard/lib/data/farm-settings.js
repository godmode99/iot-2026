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
    metrics: {
      deviceCount: 0,
      openAlertCount: 0,
      criticalAlertCount: 0,
      recordCount: 0,
      templateCount: 0,
      bySource: {
        record: 0,
        telemetry: 0,
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

  const [
    devicesResult,
    alertsResult,
    recordsResult,
    templatesResult,
    membersResult,
    resellersResult,
    preferencesResult,
    auditResult
  ] = await Promise.all([
    supabase
      .from("devices")
      .select("id,device_id,serial_number,provisioning_state,device_status(online_state,last_seen_at,battery_percent)")
      .eq("farm_id", farmId)
      .order("device_id", { ascending: true })
      .limit(20),
    supabase
      .from("alerts")
      .select("id,alert_type,severity,status,opened_at,details_json,devices(device_id,serial_number)")
      .eq("farm_id", farmId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(12),
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
      metrics: {
        deviceCount: devices.data.length,
        openAlertCount: alerts.data.length,
        criticalAlertCount: alerts.data.filter((alert) => alert.severity === "critical").length,
        recordCount: records.data.length,
        templateCount: templates.data.length,
        bySource: {
          record: alerts.data.filter((alert) => alert.source === "record_detail").length,
          telemetry: alerts.data.filter((alert) => alert.source === "device_telemetry").length,
          system: alerts.data.filter((alert) => !["record_detail", "device_telemetry"].includes(alert.source)).length
        }
      }
    },
    errors: [canManageResult.error?.message, devices.error, alerts.error, records.error, templates.error, members.error, resellers.error, preferences.error, audit.error].filter(Boolean)
  };
}
