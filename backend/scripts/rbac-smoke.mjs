import assert from "node:assert/strict";
import postgres from "postgres";

const dbUrl = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@localhost:54322/postgres";
const farmId = "22222222-2222-2222-2222-222222222222";
const users = {
  owner: "11111111-1111-1111-1111-111111111111",
  operator: "33333333-3333-3333-3333-333333333333",
  reseller: "44444444-4444-4444-4444-444444444444",
  member: "55555555-5555-5555-5555-555555555555",
  outsider: "66666666-6666-6666-6666-666666666666"
};

const sql = postgres(dbUrl, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10
});

async function asAuthenticated(userId, callback) {
  return sql.begin(async (trx) => {
    await trx`set local role authenticated`;
    await trx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await trx`select set_config('request.jwt.claim.role', 'authenticated', true)`;
    return callback(trx);
  });
}

async function getFarmPermissionSnapshot(userId) {
  return asAuthenticated(userId, async (trx) => {
    const [permissions] = await trx`
      select
        public.can_view_farm(${farmId}::uuid) as can_view,
        public.can_manage_farm_alerts(${farmId}::uuid) as can_manage_alerts,
        public.can_send_farm_command(${farmId}::uuid, 'telemetry_flush') as can_send_safe_command,
        public.can_send_farm_command(${farmId}::uuid, 'ota_apply') as can_send_ota_apply
    `;

    const visibleFarms = await trx`
      select id
      from public.farms
      order by name asc
    `;

    const visibleDevices = await trx`
      select device_id
      from public.devices
      order by device_id asc
    `;

    return {
      ...permissions,
      visibleFarmCount: visibleFarms.length,
      visibleDeviceIds: visibleDevices.map((device) => device.device_id)
    };
  });
}

async function updateOwnProfileSnapshot(userId) {
  return asAuthenticated(userId, async (trx) => {
    const [before] = await trx`
      select display_name, preferred_locale, user_type
      from public.user_profiles
      where user_id = ${userId}::uuid
    `;

    const [updated] = await trx`
      select display_name, preferred_locale, user_type
      from public.update_own_profile('Owner Smoke', 'en')
    `;

    const [restored] = await trx`
      select display_name, preferred_locale, user_type
      from public.update_own_profile(${before.display_name}, ${before.preferred_locale})
    `;

    return { before, updated, restored };
  });
}

const owner = await getFarmPermissionSnapshot(users.owner);
assert.equal(owner.can_view, true, "owner should view farm");
assert.equal(owner.can_manage_alerts, true, "owner should manage alerts");
assert.equal(owner.can_send_safe_command, true, "owner should send safe commands");
assert.equal(owner.can_send_ota_apply, true, "owner should send ota_apply");
assert.equal(owner.visibleFarmCount, 1, "owner should see dev farm");
assert.deepEqual(owner.visibleDeviceIds, ["sb00-devkit-01"], "owner should see bound farm device only");

const profileUpdate = await updateOwnProfileSnapshot(users.owner);
assert.equal(profileUpdate.updated.display_name, "Owner Smoke", "profile RPC should update display name");
assert.equal(profileUpdate.updated.preferred_locale, "en", "profile RPC should update locale");
assert.equal(profileUpdate.updated.user_type, profileUpdate.before.user_type, "profile RPC must not change user type");
assert.equal(profileUpdate.restored.preferred_locale, profileUpdate.before.preferred_locale, "profile smoke should restore locale");

const operator = await getFarmPermissionSnapshot(users.operator);
assert.equal(operator.can_view, true, "operator should view farm");
assert.equal(operator.can_manage_alerts, true, "operator should manage alerts");
assert.equal(operator.can_send_safe_command, true, "operator should send safe commands");
assert.equal(operator.can_send_ota_apply, true, "operator should send ota_apply");

const reseller = await getFarmPermissionSnapshot(users.reseller);
assert.equal(reseller.can_view, true, "assigned reseller should view farm");
assert.equal(reseller.can_manage_alerts, true, "assigned reseller should manage alerts when explicitly allowed");
assert.equal(reseller.can_send_safe_command, true, "assigned reseller should send safe commands when explicitly allowed");
assert.equal(reseller.can_send_ota_apply, false, "reseller should not send ota_apply by default");
assert.equal(reseller.visibleFarmCount, 1, "reseller should see assigned farm");

const member = await getFarmPermissionSnapshot(users.member);
assert.equal(member.can_view, true, "member should view farm");
assert.equal(member.can_manage_alerts, false, "default member should not manage alerts");
assert.equal(member.can_send_safe_command, false, "default member should not send commands");
assert.equal(member.can_send_ota_apply, false, "default member should not send ota_apply");
assert.equal(member.visibleFarmCount, 1, "member should see assigned farm");

const outsider = await getFarmPermissionSnapshot(users.outsider);
assert.equal(outsider.can_view, false, "outsider should not view farm");
assert.equal(outsider.can_manage_alerts, false, "outsider should not manage alerts");
assert.equal(outsider.can_send_safe_command, false, "outsider should not send commands");
assert.equal(outsider.visibleFarmCount, 0, "outsider should see no farms");
assert.deepEqual(outsider.visibleDeviceIds, [], "outsider should see no devices");

await sql.end();

console.log("[rbac-smoke] passed", {
  owner,
  operator,
  reseller,
  member,
  outsider
});
