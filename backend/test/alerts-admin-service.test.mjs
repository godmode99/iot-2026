import test from "node:test";
import assert from "node:assert/strict";
import { adminUpdateAlertStatus } from "../src/alerts/admin-service.mjs";

test("adminUpdateAlertStatus rejects invalid action", async () => {
  const result = await adminUpdateAlertStatus({
    alertId: "alert-1",
    action: "noop"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "alert_action_invalid");
});

test("adminUpdateAlertStatus updates alert to acknowledged", async () => {
  const result = await adminUpdateAlertStatus({
    alertId: "alert-1",
    action: "acknowledge",
    requestedBy: "11111111-1111-1111-1111-111111111111",
    note: "Investigating"
  }, {
    findAlert: async () => ({
      id: "alert-1",
      status: "open"
    }),
    updateAlert: async (_alertId, status) => ({
      id: "alert-1",
      status
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "alert_status_updated");
  assert.equal(result.result.alert.status, "acknowledged");
});

test("adminUpdateAlertStatus is idempotent when already in target status", async () => {
  const result = await adminUpdateAlertStatus({
    alertId: "alert-1",
    action: "resolve"
  }, {
    findAlert: async () => ({
      id: "alert-1",
      status: "resolved"
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "alert_status_unchanged");
});
