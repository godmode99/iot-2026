import test from "node:test";
import assert from "node:assert/strict";
import { ingestTelemetryEnvelope } from "../src/ingest/service.mjs";

function makeConfig() {
  return {
    values: {
      MQTT_TOPIC_PREFIX: "sb00/devices"
    }
  };
}

function makeEnvelope(overrides = {}) {
  return {
    topic: "sb00/devices/sb00-devkit-01/telemetry",
    payload: {
      device_id: "sb00-devkit-01",
      timestamp: "2026-04-04T12:00:00.000Z",
      temperature_c: 27.5,
      turbidity_raw: 1234,
      battery_percent: 82,
      battery_mv: 4010,
      lat: 13.7563,
      lng: 100.5018
    },
    ...overrides
  };
}

test("ingestTelemetryEnvelope rejects retired devices", async () => {
  const result = await ingestTelemetryEnvelope(makeConfig(), makeEnvelope(), {
    findDevice: async () => ({
      id: "device-1",
      device_id: "sb00-devkit-01",
      provisioning_state: "retired"
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "device_retired");
  assert.equal(result.statusCode, 409);
});

test("ingestTelemetryEnvelope returns duplicate acceptance code", async () => {
  const result = await ingestTelemetryEnvelope(makeConfig(), makeEnvelope(), {
    findDevice: async () => ({
      id: "device-1",
      device_id: "sb00-devkit-01",
      provisioning_state: "active"
    }),
    persist: async () => ({
      duplicate: true
    }),
    evaluateAlerts: async () => []
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "accepted_duplicate");
  assert.equal(result.statusCode, 200);
});
