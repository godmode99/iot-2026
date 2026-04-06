import { createHash, randomBytes } from "node:crypto";
import {
  acceptFarmMemberInvite,
  findActiveInviteByTokenHash,
  findUserProfile,
  insertAuditLog,
  insertFarmMemberInvite,
  listAuditLog,
  listFarmMembers,
  listNotificationPreferences,
  listResellerFarmAssignments,
  upsertNotificationPreference,
  upsertResellerFarmAssignment
} from "./repository.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedAlertTypes = new Set(["threshold", "low_battery", "sensor_fault", "offline"]);

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function validateUuid(value, code) {
  if (!uuidPattern.test(String(value ?? ""))) {
    return {
      ok: false,
      statusCode: 400,
      code,
      details: [value ?? ""]
    };
  }
  return { ok: true };
}

function normalizePermissionFlags(permissions = {}) {
  return {
    can_view: normalizeBoolean(permissions.can_view, true),
    can_receive_alerts: normalizeBoolean(permissions.can_receive_alerts, true),
    can_manage_alerts: normalizeBoolean(permissions.can_manage_alerts, false),
    can_send_commands: normalizeBoolean(permissions.can_send_commands, false)
  };
}

function hashInviteToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function actorTypeForProfile(profile) {
  if (!profile) {
    return "system";
  }
  return profile.user_type === "customer" ? "customer" : profile.user_type;
}

export async function createFarmMemberInvite(input, dependencies = {}) {
  const createInvite = dependencies.createInvite ?? insertFarmMemberInvite;
  const writeAudit = dependencies.writeAudit ?? insertAuditLog;
  const getProfile = dependencies.getProfile ?? findUserProfile;
  const farmValidation = validateUuid(input.farmId, "farm_id_invalid");
  const actorValidation = validateUuid(input.invitedBy, "invited_by_invalid");

  if (!farmValidation.ok) {
    return farmValidation;
  }
  if (!actorValidation.ok) {
    return actorValidation;
  }

  const email = normalizeEmail(input.email);
  if (!emailPattern.test(email)) {
    return {
      ok: false,
      statusCode: 400,
      code: "invite_email_invalid",
      details: [email]
    };
  }

  const inviteToken = randomBytes(32).toString("base64url");
  const inviteTokenHash = hashInviteToken(inviteToken);
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const permissions = normalizePermissionFlags(input.permissions);
  const invite = await createInvite({
    farmId: input.farmId,
    email,
    permissions,
    invitedBy: input.invitedBy,
    expiresAt,
    inviteTokenHash
  });

  const actorProfile = await getProfile(input.invitedBy);
  await writeAudit({
    actorUserId: input.invitedBy,
    actorType: actorTypeForProfile(actorProfile),
    farmId: input.farmId,
    action: "farm_member_invite.created",
    targetType: "farm_member_invite",
    targetId: invite?.id ?? null,
    details: {
      email,
      permissions,
      expiresAt
    }
  });

  return {
    ok: true,
    statusCode: 201,
    code: "farm_member_invite_created",
    result: {
      invite,
      inviteToken
    }
  };
}

export async function acceptInvite(input, dependencies = {}) {
  const findInvite = dependencies.findInvite ?? findActiveInviteByTokenHash;
  const acceptInviteRow = dependencies.acceptInvite ?? acceptFarmMemberInvite;
  const writeAudit = dependencies.writeAudit ?? insertAuditLog;
  const acceptedByValidation = validateUuid(input.acceptedBy, "accepted_by_invalid");

  if (!acceptedByValidation.ok) {
    return acceptedByValidation;
  }

  const token = String(input.inviteToken ?? "").trim();
  if (!token) {
    return {
      ok: false,
      statusCode: 400,
      code: "invite_token_required",
      details: []
    };
  }

  const invite = await findInvite(hashInviteToken(token));
  if (!invite) {
    return {
      ok: false,
      statusCode: 404,
      code: "invite_not_found",
      details: []
    };
  }

  if (invite.accepted_at) {
    return {
      ok: false,
      statusCode: 409,
      code: "invite_already_accepted",
      details: [invite.id]
    };
  }

  if (invite.revoked_at) {
    return {
      ok: false,
      statusCode: 409,
      code: "invite_revoked",
      details: [invite.id]
    };
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      statusCode: 410,
      code: "invite_expired",
      details: [invite.id]
    };
  }

  const acceptedEmail = normalizeEmail(input.acceptedEmail);
  if (acceptedEmail && acceptedEmail !== normalizeEmail(invite.email)) {
    return {
      ok: false,
      statusCode: 403,
      code: "invite_email_mismatch",
      details: [acceptedEmail]
    };
  }

  const result = await acceptInviteRow({
    invite,
    acceptedBy: input.acceptedBy
  });

  await writeAudit({
    actorUserId: input.acceptedBy,
    actorType: "farm_member",
    farmId: invite.farm_id,
    action: "farm_member_invite.accepted",
    targetType: "farm_member",
    targetId: result.member?.id ?? null,
    details: {
      inviteId: invite.id,
      email: invite.email
    }
  });

  return {
    ok: true,
    statusCode: 200,
    code: "farm_member_invite_accepted",
    result
  };
}

export async function getFarmMembers({ farmId }) {
  const validation = validateUuid(farmId, "farm_id_invalid");
  if (!validation.ok) {
    return validation;
  }

  const members = await listFarmMembers(farmId);
  return {
    ok: true,
    statusCode: 200,
    code: "farm_members_listed",
    result: {
      members
    }
  };
}

export async function assignResellerToFarm(input, dependencies = {}) {
  const getProfile = dependencies.getProfile ?? findUserProfile;
  const assign = dependencies.assign ?? upsertResellerFarmAssignment;
  const writeAudit = dependencies.writeAudit ?? insertAuditLog;
  const farmValidation = validateUuid(input.farmId, "farm_id_invalid");
  const resellerValidation = validateUuid(input.resellerUserId, "reseller_user_id_invalid");

  if (!farmValidation.ok) {
    return farmValidation;
  }
  if (!resellerValidation.ok) {
    return resellerValidation;
  }

  const resellerProfile = await getProfile(input.resellerUserId);
  if (!resellerProfile || resellerProfile.user_type !== "reseller") {
    return {
      ok: false,
      statusCode: 400,
      code: "user_not_reseller",
      details: [input.resellerUserId]
    };
  }

  const assignment = await assign({
    farmId: input.farmId,
    resellerUserId: input.resellerUserId,
    assignedBy: input.assignedBy ?? null,
    canManageAlerts: normalizeBoolean(input.canManageAlerts, false),
    canSendSafeCommands: normalizeBoolean(input.canSendSafeCommands, false)
  });

  const actorProfile = input.assignedBy ? await getProfile(input.assignedBy) : null;
  await writeAudit({
    actorUserId: input.assignedBy ?? null,
    actorType: actorTypeForProfile(actorProfile),
    farmId: input.farmId,
    action: "reseller_farm.assigned",
    targetType: "reseller_farm",
    targetId: assignment?.id ?? null,
    details: {
      resellerUserId: input.resellerUserId,
      canManageAlerts: assignment?.can_manage_alerts ?? false,
      canSendSafeCommands: assignment?.can_send_safe_commands ?? false
    }
  });

  return {
    ok: true,
    statusCode: 200,
    code: "reseller_farm_assigned",
    result: {
      assignment
    }
  };
}

export async function getResellerAssignments({ farmId }) {
  const validation = validateUuid(farmId, "farm_id_invalid");
  if (!validation.ok) {
    return validation;
  }

  const assignments = await listResellerFarmAssignments(farmId);
  return {
    ok: true,
    statusCode: 200,
    code: "reseller_farms_listed",
    result: {
      assignments
    }
  };
}

export async function saveNotificationPreference(input, dependencies = {}) {
  const savePreference = dependencies.savePreference ?? upsertNotificationPreference;
  const writeAudit = dependencies.writeAudit ?? insertAuditLog;
  const getProfile = dependencies.getProfile ?? findUserProfile;
  const farmValidation = validateUuid(input.farmId, "farm_id_invalid");
  const userValidation = validateUuid(input.userId, "user_id_invalid");

  if (!farmValidation.ok) {
    return farmValidation;
  }
  if (!userValidation.ok) {
    return userValidation;
  }

  const alertTypes = Array.isArray(input.alertTypes)
    ? input.alertTypes.filter((type) => allowedAlertTypes.has(type))
    : [];

  const preference = await savePreference({
    farmId: input.farmId,
    userId: input.userId,
    emailEnabled: normalizeBoolean(input.emailEnabled, true),
    lineEnabled: normalizeBoolean(input.lineEnabled, false),
    criticalOnly: normalizeBoolean(input.criticalOnly, false),
    alertTypes
  });

  const actorProfile = input.actorUserId ? await getProfile(input.actorUserId) : null;
  await writeAudit({
    actorUserId: input.actorUserId ?? null,
    actorType: actorTypeForProfile(actorProfile),
    farmId: input.farmId,
    action: "notification_preference.updated",
    targetType: "notification_preference",
    targetId: preference?.id ?? null,
    details: {
      userId: input.userId,
      emailEnabled: preference?.email_enabled ?? null,
      lineEnabled: preference?.line_enabled ?? null,
      criticalOnly: preference?.critical_only ?? null,
      alertTypes: preference?.alert_types ?? []
    }
  });

  return {
    ok: true,
    statusCode: 200,
    code: "notification_preference_updated",
    result: {
      preference
    }
  };
}

export async function getNotificationPreferences({ farmId }) {
  const validation = validateUuid(farmId, "farm_id_invalid");
  if (!validation.ok) {
    return validation;
  }

  const preferences = await listNotificationPreferences(farmId);
  return {
    ok: true,
    statusCode: 200,
    code: "notification_preferences_listed",
    result: {
      preferences
    }
  };
}

export async function getAuditLog({ farmId = null, limit = 50 } = {}) {
  if (farmId) {
    const validation = validateUuid(farmId, "farm_id_invalid");
    if (!validation.ok) {
      return validation;
    }
  }

  const audit = await listAuditLog({
    farmId,
    limit: Number.isFinite(limit) ? limit : 50
  });

  return {
    ok: true,
    statusCode: 200,
    code: "audit_log_listed",
    result: {
      audit
    }
  };
}
