import { getDb } from "../db.mjs";

export async function findUserProfile(userId) {
  const sql = getDb();
  const rows = await sql`
    select user_id, user_type, display_name, preferred_locale
    from public.user_profiles
    where user_id = ${userId}::uuid
    limit 1
  `;

  return rows[0] ?? null;
}

export async function listFarmMembers(farmId) {
  const sql = getDb();
  return sql`
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
}

export async function insertFarmMemberInvite(invite) {
  const sql = getDb();
  const rows = await sql`
    insert into public.farm_member_invites (
      farm_id,
      email,
      invite_token_hash,
      permission_json,
      invited_by,
      expires_at
    ) values (
      ${invite.farmId}::uuid,
      ${invite.email},
      ${invite.inviteTokenHash},
      ${sql.json(invite.permissions)}::jsonb,
      ${invite.invitedBy}::uuid,
      ${invite.expiresAt}
    )
    returning
      id,
      farm_id,
      email,
      permission_json,
      invited_by,
      expires_at,
      accepted_at,
      revoked_at,
      created_at
  `;

  return rows[0] ?? null;
}

export async function findActiveInviteByTokenHash(inviteTokenHash) {
  const sql = getDb();
  const rows = await sql`
    select
      id,
      farm_id,
      email,
      invite_token_hash,
      permission_json,
      invited_by,
      accepted_by,
      expires_at,
      accepted_at,
      revoked_at,
      created_at
    from public.farm_member_invites
    where invite_token_hash = ${inviteTokenHash}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function acceptFarmMemberInvite({ invite, acceptedBy }) {
  const sql = getDb();

  return sql.begin(async (trx) => {
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
        ${invite.farm_id},
        ${acceptedBy}::uuid,
        'member',
        ${permission.can_view ?? true},
        ${permission.can_receive_alerts ?? true},
        ${permission.can_manage_alerts ?? false},
        ${permission.can_send_commands ?? false},
        ${invite.invited_by}
      )
      on conflict (farm_id, user_id) do update
      set
        can_view = excluded.can_view,
        can_receive_alerts = excluded.can_receive_alerts,
        can_manage_alerts = excluded.can_manage_alerts,
        can_send_commands = excluded.can_send_commands,
        invited_by = excluded.invited_by,
        updated_at = timezone('utc', now())
      returning
        id,
        farm_id,
        user_id,
        role,
        can_view,
        can_receive_alerts,
        can_manage_alerts,
        can_send_commands
    `;

    const inviteRows = await trx`
      update public.farm_member_invites
      set
        accepted_by = ${acceptedBy}::uuid,
        accepted_at = timezone('utc', now())
      where id = ${invite.id}
        and accepted_at is null
        and revoked_at is null
      returning id, accepted_at
    `;

    return {
      member: memberRows[0] ?? null,
      invite: inviteRows[0] ?? null
    };
  });
}

export async function listResellerFarmAssignments(farmId) {
  const sql = getDb();
  return sql`
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
}

export async function upsertResellerFarmAssignment(assignment) {
  const sql = getDb();
  const rows = await sql`
    insert into public.reseller_farms (
      reseller_user_id,
      farm_id,
      can_view,
      can_manage_alerts,
      can_send_safe_commands,
      assigned_by
    ) values (
      ${assignment.resellerUserId}::uuid,
      ${assignment.farmId}::uuid,
      true,
      ${assignment.canManageAlerts},
      ${assignment.canSendSafeCommands},
      ${assignment.assignedBy ?? null}
    )
    on conflict (reseller_user_id, farm_id) do update
    set
      can_view = true,
      can_manage_alerts = excluded.can_manage_alerts,
      can_send_safe_commands = excluded.can_send_safe_commands,
      assigned_by = excluded.assigned_by,
      assigned_at = timezone('utc', now())
    returning
      id,
      reseller_user_id,
      farm_id,
      can_view,
      can_manage_alerts,
      can_send_safe_commands,
      assigned_by,
      assigned_at
  `;

  return rows[0] ?? null;
}

export async function upsertNotificationPreference(preference) {
  const sql = getDb();
  const rows = await sql`
    insert into public.notification_preferences (
      farm_id,
      user_id,
      email_enabled,
      line_enabled,
      critical_only,
      alert_types
    ) values (
      ${preference.farmId}::uuid,
      ${preference.userId}::uuid,
      ${preference.emailEnabled},
      ${preference.lineEnabled},
      ${preference.criticalOnly},
      ${sql.array(preference.alertTypes, "text")}
    )
    on conflict (farm_id, user_id) do update
    set
      email_enabled = excluded.email_enabled,
      line_enabled = excluded.line_enabled,
      critical_only = excluded.critical_only,
      alert_types = excluded.alert_types,
      updated_at = timezone('utc', now())
    returning
      id,
      farm_id,
      user_id,
      email_enabled,
      line_enabled,
      critical_only,
      alert_types,
      updated_at
  `;

  return rows[0] ?? null;
}

export async function listNotificationPreferences(farmId) {
  const sql = getDb();
  return sql`
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
}

export async function insertAuditLog(entry) {
  const sql = getDb();
  const rows = await sql`
    insert into public.audit_log (
      actor_user_id,
      actor_type,
      farm_id,
      device_id,
      action,
      target_type,
      target_id,
      details_json
    ) values (
      ${entry.actorUserId ?? null},
      ${entry.actorType},
      ${entry.farmId ?? null},
      ${entry.deviceId ?? null},
      ${entry.action},
      ${entry.targetType},
      ${entry.targetId ?? null},
      ${sql.json(entry.details ?? {})}::jsonb
    )
    returning id, actor_user_id, actor_type, action, target_type, target_id, created_at
  `;

  return rows[0] ?? null;
}

export async function listAuditLog({ farmId = null, limit = 50 } = {}) {
  const sql = getDb();
  if (farmId) {
    return sql`
      select id, actor_user_id, actor_type, farm_id, device_id, action, target_type, target_id, details_json, created_at
      from public.audit_log
      where farm_id = ${farmId}::uuid
      order by created_at desc
      limit ${Math.max(1, Math.min(limit, 200))}
    `;
  }

  return sql`
    select id, actor_user_id, actor_type, farm_id, device_id, action, target_type, target_id, details_json, created_at
    from public.audit_log
    order by created_at desc
    limit ${Math.max(1, Math.min(limit, 200))}
  `;
}
