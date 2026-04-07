import { createHash, randomBytes } from "node:crypto";
import {
  actorTypeForUser,
  fail,
  getDashboardDb,
  ok,
  userCanManageFarmSettings
} from "./db.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedAlertTypes = new Set(["threshold", "low_battery", "sensor_fault", "offline"]);

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function hashInviteToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireFarmSettingsAccess(sql, actorUserId, farmId) {
  const allowed = await userCanManageFarmSettings(sql, actorUserId, farmId);
  if (!allowed) {
    return fail("farm_permission_denied", [actorUserId, farmId], 403);
  }
  return ok("farm_permission_granted");
}

export async function listFarmMembers({ farmId, actorUserId }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const members = await sql`
    select
      member.id,
      member.farm_id,
      member.user_id,
      auth_user.email,
      profile.display_name,
      profile.user_type,
      member.role,
      member.can_view,
      member.can_receive_alerts,
      member.can_manage_alerts,
      member.can_send_commands,
      member.created_at,
      member.updated_at
    from public.farm_members member
    join auth.users auth_user
      on auth_user.id = member.user_id
    left join public.user_profiles profile
      on profile.user_id = member.user_id
    where member.farm_id = ${farmId}::uuid
    order by
      case when member.role = 'owner' then 0 else 1 end,
      auth_user.email asc
  `;

  return ok("farm_members_listed", { members });
}

export async function createFarmMemberInvite({ farmId, actorUserId, email, permissions }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!emailPattern.test(normalizedEmail)) {
    return fail("invite_email_invalid", [normalizedEmail]);
  }

  const inviteToken = randomBytes(32).toString("base64url");
  const inviteTokenHash = hashInviteToken(inviteToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const permissionFlags = {
    can_view: normalizeBoolean(permissions?.can_view, true),
    can_receive_alerts: normalizeBoolean(permissions?.can_receive_alerts, true),
    can_manage_alerts: normalizeBoolean(permissions?.can_manage_alerts, false),
    can_send_commands: normalizeBoolean(permissions?.can_send_commands, false)
  };

  return sql.begin(async (trx) => {
    const inviteRows = await trx`
      insert into public.farm_member_invites (
        farm_id,
        email,
        invite_token_hash,
        permission_json,
        invited_by,
        expires_at
      ) values (
        ${farmId}::uuid,
        ${normalizedEmail},
        ${inviteTokenHash},
        ${trx.json(permissionFlags)}::jsonb,
        ${actorUserId}::uuid,
        ${expiresAt}
      )
      returning id, farm_id, email, permission_json, invited_by, expires_at, accepted_at, revoked_at, created_at
    `;

    const actorType = await actorTypeForUser(trx, actorUserId);
    await trx`
      insert into public.audit_log (
        actor_user_id,
        actor_type,
        farm_id,
        action,
        target_type,
        target_id,
        details_json
      ) values (
        ${actorUserId}::uuid,
        ${actorType},
        ${farmId}::uuid,
        'farm_member_invite.created',
        'farm_member_invite',
        ${inviteRows[0]?.id ?? null},
        ${trx.json({
          email: normalizedEmail,
          permissions: permissionFlags,
          expiresAt
        })}::jsonb
      )
    `;

    return ok("farm_member_invite_created", {
      invite: inviteRows[0],
      inviteToken
    }, 201);
  });
}

export async function acceptFarmMemberInvite({ actorUserId, inviteToken, acceptedEmail }) {
  const token = String(inviteToken ?? "").trim();
  if (!token) {
    return fail("invite_token_required");
  }

  const sql = getDashboardDb();
  return sql.begin(async (trx) => {
    const inviteRows = await trx`
      select
        id,
        farm_id,
        email,
        permission_json,
        invited_by,
        accepted_by,
        expires_at,
        accepted_at,
        revoked_at,
        created_at
      from public.farm_member_invites
      where invite_token_hash = ${hashInviteToken(token)}
      limit 1
    `;
    const invite = inviteRows[0] ?? null;

    if (!invite) {
      return fail("invite_not_found", [], 404);
    }
    if (invite.accepted_at) {
      return fail("invite_already_accepted", [invite.id], 409);
    }
    if (invite.revoked_at) {
      return fail("invite_revoked", [invite.id], 409);
    }
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return fail("invite_expired", [invite.id], 410);
    }

    const normalizedAcceptedEmail = normalizeEmail(acceptedEmail);
    if (normalizedAcceptedEmail && normalizedAcceptedEmail !== normalizeEmail(invite.email)) {
      return fail("invite_email_mismatch", [normalizedAcceptedEmail], 403);
    }

    const permission = invite.permission_json ?? {};
    const memberRows = await trx`
      insert into public.farm_members (
        farm_id,
        user_id,
        role,
        can_view,
        can_receive_alerts,
        can_manage_alerts,
        can_send_commands,
        invited_by
      ) values (
        ${invite.farm_id}::uuid,
        ${actorUserId}::uuid,
        'member',
        ${permission.can_view ?? true},
        ${permission.can_receive_alerts ?? true},
        ${permission.can_manage_alerts ?? false},
        ${permission.can_send_commands ?? false},
        ${invite.invited_by}::uuid
      )
      on conflict (farm_id, user_id) do update
      set
        can_view = excluded.can_view,
        can_receive_alerts = excluded.can_receive_alerts,
        can_manage_alerts = excluded.can_manage_alerts,
        can_send_commands = excluded.can_send_commands,
        invited_by = excluded.invited_by,
        updated_at = timezone('utc', now())
      returning id, farm_id, user_id, role, can_view, can_receive_alerts, can_manage_alerts, can_send_commands
    `;

    const acceptedRows = await trx`
      update public.farm_member_invites
      set
        accepted_by = ${actorUserId}::uuid,
        accepted_at = timezone('utc', now())
      where id = ${invite.id}::uuid
        and accepted_at is null
        and revoked_at is null
      returning id, accepted_at
    `;

    await trx`
      insert into public.audit_log (
        actor_user_id,
        actor_type,
        farm_id,
        action,
        target_type,
        target_id,
        details_json
      ) values (
        ${actorUserId}::uuid,
        'farm_member',
        ${invite.farm_id}::uuid,
        'farm_member_invite.accepted',
        'farm_member',
        ${memberRows[0]?.id ?? null},
        ${trx.json({
          inviteId: invite.id,
          email: invite.email
        })}::jsonb
      )
    `;

    return ok("farm_member_invite_accepted", {
      member: memberRows[0] ?? null,
      invite: acceptedRows[0] ?? null
    });
  });
}

export async function listResellerAssignments({ farmId, actorUserId }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const assignments = await sql`
    select
      assignment.id,
      assignment.farm_id,
      assignment.reseller_user_id,
      auth_user.email,
      profile.display_name,
      assignment.can_view,
      assignment.can_manage_alerts,
      assignment.can_send_safe_commands,
      assignment.assigned_by,
      assignment.assigned_at
    from public.reseller_farms assignment
    join auth.users auth_user
      on auth_user.id = assignment.reseller_user_id
    left join public.user_profiles profile
      on profile.user_id = assignment.reseller_user_id
    where assignment.farm_id = ${farmId}::uuid
    order by assignment.assigned_at desc
  `;

  return ok("reseller_farms_listed", { assignments });
}

export async function assignResellerToFarm({ farmId, actorUserId, resellerUserId, canManageAlerts, canSendSafeCommands }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const resellerProfile = await sql`
    select user_id, user_type
    from public.user_profiles
    where user_id = ${resellerUserId}::uuid
    limit 1
  `;

  if (resellerProfile[0]?.user_type !== "reseller") {
    return fail("user_not_reseller", [resellerUserId]);
  }

  return sql.begin(async (trx) => {
    const assignmentRows = await trx`
      insert into public.reseller_farms (
        reseller_user_id,
        farm_id,
        can_view,
        can_manage_alerts,
        can_send_safe_commands,
        assigned_by
      ) values (
        ${resellerUserId}::uuid,
        ${farmId}::uuid,
        true,
        ${normalizeBoolean(canManageAlerts, false)},
        ${normalizeBoolean(canSendSafeCommands, false)},
        ${actorUserId}::uuid
      )
      on conflict (reseller_user_id, farm_id) do update
      set
        can_view = true,
        can_manage_alerts = excluded.can_manage_alerts,
        can_send_safe_commands = excluded.can_send_safe_commands,
        assigned_by = excluded.assigned_by,
        assigned_at = timezone('utc', now())
      returning id, reseller_user_id, farm_id, can_view, can_manage_alerts, can_send_safe_commands, assigned_by, assigned_at
    `;

    const actorType = await actorTypeForUser(trx, actorUserId);
    await trx`
      insert into public.audit_log (
        actor_user_id,
        actor_type,
        farm_id,
        action,
        target_type,
        target_id,
        details_json
      ) values (
        ${actorUserId}::uuid,
        ${actorType},
        ${farmId}::uuid,
        'reseller_farm.assigned',
        'reseller_farm',
        ${assignmentRows[0]?.id ?? null},
        ${trx.json({
          resellerUserId,
          canManageAlerts: assignmentRows[0]?.can_manage_alerts ?? false,
          canSendSafeCommands: assignmentRows[0]?.can_send_safe_commands ?? false
        })}::jsonb
      )
    `;

    return ok("reseller_farm_assigned", {
      assignment: assignmentRows[0]
    });
  });
}

export async function listNotificationPreferences({ farmId, actorUserId }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const preferences = await sql`
    select
      preference.id,
      preference.farm_id,
      preference.user_id,
      auth_user.email,
      profile.display_name,
      preference.email_enabled,
      preference.line_enabled,
      preference.critical_only,
      preference.alert_types,
      preference.updated_at
    from public.notification_preferences preference
    join auth.users auth_user
      on auth_user.id = preference.user_id
    left join public.user_profiles profile
      on profile.user_id = preference.user_id
    where preference.farm_id = ${farmId}::uuid
    order by auth_user.email asc
  `;

  return ok("notification_preferences_listed", { preferences });
}

export async function saveNotificationPreference({ farmId, userId, actorUserId, emailEnabled, lineEnabled, criticalOnly, alertTypes }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const filteredAlertTypes = Array.isArray(alertTypes)
    ? alertTypes.filter((type) => allowedAlertTypes.has(type))
    : [];

  return sql.begin(async (trx) => {
    const preferenceRows = await trx`
      insert into public.notification_preferences (
        farm_id,
        user_id,
        email_enabled,
        line_enabled,
        critical_only,
        alert_types
      ) values (
        ${farmId}::uuid,
        ${userId}::uuid,
        ${normalizeBoolean(emailEnabled, true)},
        ${normalizeBoolean(lineEnabled, false)},
        ${normalizeBoolean(criticalOnly, false)},
        ${trx.array(filteredAlertTypes, "text")}
      )
      on conflict (farm_id, user_id) do update
      set
        email_enabled = excluded.email_enabled,
        line_enabled = excluded.line_enabled,
        critical_only = excluded.critical_only,
        alert_types = excluded.alert_types,
        updated_at = timezone('utc', now())
      returning id, farm_id, user_id, email_enabled, line_enabled, critical_only, alert_types, updated_at
    `;

    const actorType = await actorTypeForUser(trx, actorUserId);
    await trx`
      insert into public.audit_log (
        actor_user_id,
        actor_type,
        farm_id,
        action,
        target_type,
        target_id,
        details_json
      ) values (
        ${actorUserId}::uuid,
        ${actorType},
        ${farmId}::uuid,
        'notification_preference.updated',
        'notification_preference',
        ${preferenceRows[0]?.id ?? null},
        ${trx.json({
          userId,
          emailEnabled: preferenceRows[0]?.email_enabled ?? null,
          lineEnabled: preferenceRows[0]?.line_enabled ?? null,
          criticalOnly: preferenceRows[0]?.critical_only ?? null,
          alertTypes: preferenceRows[0]?.alert_types ?? []
        })}::jsonb
      )
    `;

    return ok("notification_preference_updated", {
      preference: preferenceRows[0]
    });
  });
}

export async function listAuditLog({ farmId, actorUserId }) {
  const sql = getDashboardDb();
  const access = await requireFarmSettingsAccess(sql, actorUserId, farmId);
  if (!access.ok) {
    return access;
  }

  const audit = await sql`
    select id, actor_user_id, actor_type, farm_id, device_id, action, target_type, target_id, details_json, created_at
    from public.audit_log
    where farm_id = ${farmId}::uuid
    order by created_at desc
    limit 20
  `;

  return ok("audit_log_listed", { audit });
}
