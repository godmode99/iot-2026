import test from "node:test";
import assert from "node:assert/strict";

process.env.ALERT_NOTIFY_MIN_INTERVAL_SEC = "900";
process.env.NOTIFICATION_MODE = "stub";

const { evaluateAlertsForTelemetry } = await import("../src/alerts/service.mjs");

function makeDevice() {
  return {
    id: "device-1",
    device_id: "sb00-devkit-01",
    farm_id: "farm-1",
    battery_variant: "standard"
  };
}

function makeTelemetry(overrides = {}) {
  return {
    recordedAt: "2026-04-04T12:00:00.000Z",
    temperatureC: 37,
    turbidityRaw: 1200,
    batteryPercent: 50,
    batteryMv: 3990,
    lat: 13.7,
    lng: 100.5,
    batteryVariant: "standard",
    ...overrides
  };
}

test("evaluateAlertsForTelemetry opens threshold alert", async () => {
  const opened = [];
  const notifications = [];

  const result = await evaluateAlertsForTelemetry(makeDevice(), makeTelemetry(), {
    openOrRefreshAlert: async (_device, alertType, severity, details) => {
      opened.push({ alertType, severity, details });
      return {
        action: "opened",
        alert: { id: "alert-1", severity }
      };
    },
    resolveAlert: async () => null,
    annotateNotification: async (_alertId, notification) => {
      notifications.push(notification);
      return { id: "alert-1" };
    },
    dispatchNotification: async () => {
      notifications.push({ sent: true });
      return {
        channel: "stub",
        deliveryStatus: "sent",
        sentAt: new Date().toISOString()
      };
    }
  });

  assert.equal(result.length >= 1, true);
  assert.equal(opened[0].alertType, "threshold");
  assert.equal(opened[0].severity, "critical");
  assert.equal(notifications.length >= 1, true);
});

test("evaluateAlertsForTelemetry suppresses refresh notification inside cooldown", async () => {
  let notifyCount = 0;

  await evaluateAlertsForTelemetry(makeDevice(), makeTelemetry(), {
    openOrRefreshAlert: async (_device, _alertType, severity) => ({
      action: "refreshed",
      alert: { id: "alert-1", severity },
      previous: {
        severity,
        details_json: {
          notification: {
            lastActionAt: new Date().toISOString()
          }
        }
      }
    }),
    resolveAlert: async () => null,
    annotateNotification: async () => null,
    dispatchNotification: async () => {
      notifyCount += 1;
      return {
        channel: "stub",
        deliveryStatus: "sent",
        sentAt: new Date().toISOString()
      };
    }
  });

  assert.equal(notifyCount, 0);
});
