import test from "node:test";
import assert from "node:assert/strict";
import {
  acknowledgeCommandResult,
  fetchPendingCommandsForDevice,
  saveFarmNotificationTargets
} from "../src/admin/service.mjs";

test("fetchPendingCommandsForDevice returns queued commands for active device", async () => {
  const result = await fetchPendingCommandsForDevice({
    deviceId: "sb00-devkit-01",
    limit: 10
  }, {
    findDevice: async () => ({
      id: "device-1",
      device_id: "sb00-devkit-01",
      provisioning_state: "active"
    }),
    claimPending: async () => ([
      {
        id: "command-1",
        command_type: "reboot",
        status: "sent"
      }
    ])
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "commands_available");
  assert.equal(result.result.commands.length, 1);
});

test("acknowledgeCommandResult rejects invalid final status", async () => {
  const result = await acknowledgeCommandResult({
    commandId: "command-1",
    deviceId: "sb00-devkit-01",
    status: "sent"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "command_status_invalid");
});

test("acknowledgeCommandResult returns acknowledged command", async () => {
  const result = await acknowledgeCommandResult({
    commandId: "command-1",
    deviceId: "sb00-devkit-01",
    status: "succeeded",
    details: {
      message: "done"
    }
  }, {
    findDevice: async () => ({
      id: "device-1",
      device_id: "sb00-devkit-01",
      provisioning_state: "active"
    }),
    acknowledge: async () => ({
      id: "command-1",
      status: "succeeded"
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "command_acknowledged");
  assert.equal(result.result.command.status, "succeeded");
});

test("saveFarmNotificationTargets rejects invalid email", async () => {
  const result = await saveFarmNotificationTargets({
    farmId: "22222222-2222-2222-2222-222222222222",
    alertEmailTo: "not-an-email",
    alertLineUserId: "Ufarm123"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "alert_email_invalid");
});

test("saveFarmNotificationTargets normalizes blanks to null", async () => {
  const result = await saveFarmNotificationTargets({
    farmId: "22222222-2222-2222-2222-222222222222",
    alertEmailTo: "  farm-alerts@example.com  ",
    alertLineUserId: "   "
  }, {
    updateTargets: async (payload) => ({
      id: payload.farmId,
      alert_email_to: payload.alertEmailTo,
      alert_line_user_id: payload.alertLineUserId
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.farm.alert_email_to, "farm-alerts@example.com");
  assert.equal(result.result.farm.alert_line_user_id, null);
});
