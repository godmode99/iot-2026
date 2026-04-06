import { buildTrustedActorHeaders, fetchBackendJson } from "./admin.js";

function jsonHeaders(actorUserId) {
  return buildTrustedActorHeaders(actorUserId, { "content-type": "application/json" });
}

export async function listFarmMembers({ farmId, actorUserId }) {
  return fetchBackendJson(`/api/admin/farms/${encodeURIComponent(farmId)}/members`, {
    headers: buildTrustedActorHeaders(actorUserId)
  });
}

export async function createFarmMemberInvite({ farmId, actorUserId, email, permissions }) {
  return fetchBackendJson(`/api/admin/farms/${encodeURIComponent(farmId)}/invites`, {
    method: "POST",
    headers: jsonHeaders(actorUserId),
    body: JSON.stringify({
      email,
      permissions
    })
  });
}

export async function listResellerAssignments({ farmId, actorUserId }) {
  return fetchBackendJson(`/api/admin/farms/${encodeURIComponent(farmId)}/resellers`, {
    headers: buildTrustedActorHeaders(actorUserId)
  });
}

export async function assignResellerToFarm({ farmId, actorUserId, resellerUserId, canManageAlerts, canSendSafeCommands }) {
  return fetchBackendJson(`/api/admin/farms/${encodeURIComponent(farmId)}/resellers`, {
    method: "POST",
    headers: jsonHeaders(actorUserId),
    body: JSON.stringify({
      reseller_user_id: resellerUserId,
      can_manage_alerts: canManageAlerts,
      can_send_safe_commands: canSendSafeCommands
    })
  });
}

export async function listNotificationPreferences({ farmId, actorUserId }) {
  return fetchBackendJson(`/api/admin/farms/${encodeURIComponent(farmId)}/notification-preferences`, {
    headers: buildTrustedActorHeaders(actorUserId)
  });
}

export async function saveNotificationPreference({ farmId, userId, actorUserId, emailEnabled, lineEnabled, criticalOnly, alertTypes }) {
  return fetchBackendJson(`/api/admin/farms/${encodeURIComponent(farmId)}/notification-preferences/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: jsonHeaders(actorUserId),
    body: JSON.stringify({
      email_enabled: emailEnabled,
      line_enabled: lineEnabled,
      critical_only: criticalOnly,
      alert_types: alertTypes
    })
  });
}

export async function listAuditLog({ farmId, actorUserId }) {
  const query = new URLSearchParams({
    farm_id: farmId,
    limit: "20"
  });

  return fetchBackendJson(`/api/admin/audit-log?${query.toString()}`, {
    headers: buildTrustedActorHeaders(actorUserId)
  });
}

