import postgres from "postgres";

let sqlInstance;

export function getDashboardDb() {
  if (sqlInstance) {
    return sqlInstance;
  }

  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("SUPABASE_DB_URL is required for dashboard server actions");
  }

  sqlInstance = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10
  });

  return sqlInstance;
}

export function ok(code, result = {}, statusCode = 200) {
  return {
    ok: true,
    statusCode,
    code,
    result
  };
}

export function fail(code, details = [], statusCode = 400) {
  return {
    ok: false,
    statusCode,
    code,
    details
  };
}

export async function actorTypeForUser(sql, actorUserId) {
  if (!actorUserId) {
    return "system";
  }

  const rows = await sql`
    select user_type
    from public.user_profiles
    where user_id = ${actorUserId}::uuid
    limit 1
  `;

  const userType = rows[0]?.user_type;
  if (!userType) {
    return "system";
  }

  return userType === "customer" ? "customer" : userType;
}

export async function userCanManageFarmSettings(sql, actorUserId, farmId) {
  const rows = await sql`
    select exists (
      select 1
      from public.user_profiles profile
      where profile.user_id = ${actorUserId}::uuid
        and profile.user_type in ('super_admin', 'operator')
    ) or exists (
      select 1
      from public.farms farm
      where farm.id = ${farmId}::uuid
        and farm.owner_user_id = ${actorUserId}::uuid
    ) as allowed
  `;

  return rows[0]?.allowed === true;
}

export async function userCanManageFarmAlerts(sql, actorUserId, farmId) {
  const rows = await sql`
    select exists (
      select 1
      from public.user_profiles profile
      where profile.user_id = ${actorUserId}::uuid
        and profile.user_type in ('super_admin', 'operator')
    ) or exists (
      select 1
      from public.farms farm
      where farm.id = ${farmId}::uuid
        and farm.owner_user_id = ${actorUserId}::uuid
    ) or exists (
      select 1
      from public.farm_members member
      where member.farm_id = ${farmId}::uuid
        and member.user_id = ${actorUserId}::uuid
        and member.can_manage_alerts = true
    ) or exists (
      select 1
      from public.reseller_farms assignment
      join public.user_profiles profile
        on profile.user_id = assignment.reseller_user_id
      where assignment.farm_id = ${farmId}::uuid
        and assignment.reseller_user_id = ${actorUserId}::uuid
        and assignment.can_manage_alerts = true
        and profile.user_type = 'reseller'
    ) as allowed
  `;

  return rows[0]?.allowed === true;
}

export async function userCanSendFarmCommand(sql, actorUserId, farmId, commandType) {
  const rows = await sql`
    select case
      when ${commandType} = 'ota_apply' then exists (
        select 1
        from public.user_profiles profile
        where profile.user_id = ${actorUserId}::uuid
          and profile.user_type in ('super_admin', 'operator')
      ) or exists (
        select 1
        from public.farms farm
        where farm.id = ${farmId}::uuid
          and farm.owner_user_id = ${actorUserId}::uuid
      )
      when ${commandType} in ('reboot', 'config_refresh', 'ota_check', 'telemetry_flush') then exists (
        select 1
        from public.user_profiles profile
        where profile.user_id = ${actorUserId}::uuid
          and profile.user_type in ('super_admin', 'operator')
      ) or exists (
        select 1
        from public.farms farm
        where farm.id = ${farmId}::uuid
          and farm.owner_user_id = ${actorUserId}::uuid
      ) or exists (
        select 1
        from public.farm_members member
        where member.farm_id = ${farmId}::uuid
          and member.user_id = ${actorUserId}::uuid
          and member.can_send_commands = true
      ) or exists (
        select 1
        from public.reseller_farms assignment
        join public.user_profiles profile
          on profile.user_id = assignment.reseller_user_id
        where assignment.farm_id = ${farmId}::uuid
          and assignment.reseller_user_id = ${actorUserId}::uuid
          and assignment.can_send_safe_commands = true
          and profile.user_type = 'reseller'
      )
      else false
    end as allowed
  `;

  return rows[0]?.allowed === true;
}

export async function userCanManageRecordTemplates(sql, actorUserId) {
  const rows = await sql`
    select exists (
      select 1
      from public.user_profiles profile
      where profile.user_id = ${actorUserId}::uuid
        and profile.user_type in ('super_admin', 'operator')
    ) as allowed
  `;

  return rows[0]?.allowed === true;
}
