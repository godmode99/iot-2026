import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptInvite,
  assignResellerToFarm,
  createFarmMemberInvite,
  saveNotificationPreference
} from "../src/rbac/service.mjs";

const farmId = "22222222-2222-2222-2222-222222222222";
const ownerId = "11111111-1111-1111-1111-111111111111";
const resellerId = "44444444-4444-4444-4444-444444444444";
const memberId = "55555555-5555-5555-5555-555555555555";

test("createFarmMemberInvite rejects invalid email", async () => {
  const result = await createFarmMemberInvite({
    farmId,
    email: "not-an-email",
    invitedBy: ownerId
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "invite_email_invalid");
});

test("createFarmMemberInvite returns one-time invite token and writes audit", async () => {
  const audit = [];
  const result = await createFarmMemberInvite({
    farmId,
    email: "MEMBER@example.com",
    invitedBy: ownerId,
    permissions: {
      can_view: true,
      can_receive_alerts: true,
      can_manage_alerts: true
    },
    expiresAt: "2026-04-13T00:00:00.000Z"
  }, {
    createInvite: async (invite) => ({
      id: "invite-1",
      farm_id: invite.farmId,
      email: invite.email,
      permission_json: invite.permissions,
      expires_at: invite.expiresAt
    }),
    getProfile: async () => ({
      user_type: "customer"
    }),
    writeAudit: async (entry) => {
      audit.push(entry);
      return { id: "audit-1" };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "farm_member_invite_created");
  assert.match(result.result.inviteToken, /^[A-Za-z0-9_-]+$/);
  assert.equal(result.result.invite.email, "member@example.com");
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, "farm_member_invite.created");
});

test("acceptInvite rejects mismatched accepted email", async () => {
  const result = await acceptInvite({
    inviteToken: "secret-token",
    acceptedBy: memberId,
    acceptedEmail: "other@example.com"
  }, {
    findInvite: async () => ({
      id: "invite-1",
      farm_id: farmId,
      email: "member@example.com",
      expires_at: "2999-01-01T00:00:00.000Z",
      accepted_at: null,
      revoked_at: null
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "invite_email_mismatch");
});

test("assignResellerToFarm rejects users that are not reseller profiles", async () => {
  const result = await assignResellerToFarm({
    farmId,
    resellerUserId: memberId,
    assignedBy: ownerId
  }, {
    getProfile: async () => ({
      user_type: "customer"
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "user_not_reseller");
});

test("assignResellerToFarm upserts assignment and writes audit", async () => {
  const audit = [];
  const result = await assignResellerToFarm({
    farmId,
    resellerUserId: resellerId,
    assignedBy: ownerId,
    canManageAlerts: true,
    canSendSafeCommands: true
  }, {
    getProfile: async (userId) => ({
      user_type: userId === resellerId ? "reseller" : "operator"
    }),
    assign: async (assignment) => ({
      id: "reseller-farm-1",
      reseller_user_id: assignment.resellerUserId,
      farm_id: assignment.farmId,
      can_manage_alerts: assignment.canManageAlerts,
      can_send_safe_commands: assignment.canSendSafeCommands
    }),
    writeAudit: async (entry) => {
      audit.push(entry);
      return { id: "audit-2" };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "reseller_farm_assigned");
  assert.equal(result.result.assignment.can_send_safe_commands, true);
  assert.equal(audit[0].action, "reseller_farm.assigned");
});

test("saveNotificationPreference filters unsupported alert types", async () => {
  const result = await saveNotificationPreference({
    farmId,
    userId: memberId,
    actorUserId: ownerId,
    emailEnabled: true,
    lineEnabled: true,
    criticalOnly: true,
    alertTypes: ["offline", "not-supported", "low_battery"]
  }, {
    savePreference: async (preference) => ({
      id: "preference-1",
      farm_id: preference.farmId,
      user_id: preference.userId,
      email_enabled: preference.emailEnabled,
      line_enabled: preference.lineEnabled,
      critical_only: preference.criticalOnly,
      alert_types: preference.alertTypes
    }),
    getProfile: async () => ({
      user_type: "customer"
    }),
    writeAudit: async () => ({ id: "audit-3" })
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.result.preference.alert_types, ["offline", "low_battery"]);
});
