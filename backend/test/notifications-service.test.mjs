import test from "node:test";
import assert from "node:assert/strict";

async function loadNotificationService(seedEnv = {}) {
  process.env.NOTIFICATION_MODE = "stub";
  process.env.RESEND_API_KEY = "";
  process.env.ALERT_EMAIL_TO = "";
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "";
  process.env.ALERT_LINE_USER_ID = "";

  for (const [key, value] of Object.entries(seedEnv)) {
    process.env[key] = value;
  }

  return import(`../src/notifications/service.mjs?test=${Date.now()}-${Math.random()}`);
}

function makeEntry() {
  return {
    alertId: "alert-1",
    alertType: "threshold",
    action: "opened",
    severity: "critical",
    device: {
      id: "device-1",
      device_id: "sb00-devkit-01",
      farm_id: "farm-1"
    }
  };
}

test("dispatchAlertNotification logs stub delivery", async () => {
  const { dispatchAlertNotification } = await loadNotificationService({
    NOTIFICATION_MODE: "stub"
  });

  const inserts = [];
  const result = await dispatchAlertNotification(makeEntry(), {
    getFarmTargets: async () => ({
      farmId: "farm-1",
      alertEmailTo: "farm-alerts@example.com",
      alertLineUserId: "Ufarm123"
    }),
    logNotification: async (entry) => {
      inserts.push(entry);
      return { id: "notification-1", ...entry };
    }
  });

  assert.equal(result.channel, "stub");
  assert.equal(result.deliveryStatus, "sent");
  assert.equal(result.recipient, "farm-alerts@example.com");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].eventType, "threshold.opened");
});

test("dispatchAlertNotification prefers farm email target over env fallback", async () => {
  const { dispatchAlertNotification } = await loadNotificationService({
    NOTIFICATION_MODE: "resend",
    RESEND_API_KEY: "test-resend-key",
    ALERT_EMAIL_TO: "env-alerts@example.com"
  });

  const calls = [];
  const result = await dispatchAlertNotification(makeEntry(), {
    getFarmTargets: async () => ({
      farmId: "farm-1",
      alertEmailTo: "farm-alerts@example.com",
      alertLineUserId: null
    }),
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        ok: true,
        status: 200
      };
    },
    logNotification: async (entry) => ({ id: "notification-2", ...entry })
  });

  assert.equal(result.channel, "email");
  assert.equal(result.recipient, "farm-alerts@example.com");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].to, ["farm-alerts@example.com"]);
});

test("dispatchAlertNotification falls back to env line target when farm contact is missing", async () => {
  const { dispatchAlertNotification } = await loadNotificationService({
    NOTIFICATION_MODE: "line",
    LINE_CHANNEL_ACCESS_TOKEN: "test-line-token",
    ALERT_LINE_USER_ID: "Uenvfallback"
  });

  const calls = [];
  const result = await dispatchAlertNotification(makeEntry(), {
    getFarmTargets: async () => ({
      farmId: "farm-1",
      alertEmailTo: null,
      alertLineUserId: null
    }),
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        ok: true,
        status: 200
      };
    },
    logNotification: async (entry) => ({ id: "notification-3", ...entry })
  });

  assert.equal(result.channel, "line");
  assert.equal(result.recipient, "Uenvfallback");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, "Uenvfallback");
});
