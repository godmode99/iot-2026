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

  if (!canManage) {
    return {
      ...EMPTY_FARM_SETTINGS,
      farm: farmResult.data,
      canManage,
      errors: canManageResult.error ? [`permissions: ${canManageResult.error.message}`] : []
    };
  }

  const [membersResult, resellersResult, preferencesResult, auditResult] = await Promise.all([
    listFarmMembers({ farmId, actorUserId }),
    listResellerAssignments({ farmId, actorUserId }),
    listNotificationPreferences({ farmId, actorUserId }),
    listAuditLog({ farmId, actorUserId })
  ]);

  const members = normalizeAdminResult("members", membersResult, "members");
  const resellers = normalizeAdminResult("resellers", resellersResult, "assignments");
  const preferences = normalizeAdminResult("notification_preferences", preferencesResult, "preferences");
  const audit = normalizeAdminResult("audit", auditResult, "audit");

  return {
    farm: farmResult.data,
    canManage,
    members: members.data,
    resellers: resellers.data,
    notificationPreferences: preferences.data,
    audit: audit.data,
    errors: [canManageResult.error?.message, members.error, resellers.error, preferences.error, audit.error].filter(Boolean)
  };
}

