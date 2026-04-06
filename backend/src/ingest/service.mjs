import { parseIngestTopic } from "./topic-parser.mjs";
import { validateTelemetryEnvelope } from "./validator.mjs";
import { findDeviceByDeviceId, persistTelemetryAndStatus } from "./repository.mjs";
import { evaluateAlertsForTelemetry } from "../alerts/service.mjs";

export async function ingestTelemetryEnvelope(config, envelope, dependencies = {}) {
  const {
    parseTopic = parseIngestTopic,
    validate = validateTelemetryEnvelope,
    findDevice = findDeviceByDeviceId,
    persist = persistTelemetryAndStatus,
    evaluateAlerts = evaluateAlertsForTelemetry
  } = dependencies;

  const topicResult = parseTopic(envelope?.topic ?? null, config.values.MQTT_TOPIC_PREFIX);
  if (!topicResult.ok) {
    return {
      ok: false,
      statusCode: 400,
      code: "topic_invalid",
      details: [topicResult.error]
    };
  }

  if (topicResult.route !== "telemetry") {
    return {
      ok: false,
      statusCode: 400,
      code: "unsupported_topic_route",
      details: [topicResult.route]
    };
  }

  const validation = validate(envelope, config.values.MQTT_TOPIC_PREFIX);
  if (!validation.ok) {
    return {
      ok: false,
      statusCode: 400,
      code: "payload_invalid",
      details: validation.errors
    };
  }

  const telemetry = validation.normalized;
  if (topicResult.deviceIdFromTopic && topicResult.deviceIdFromTopic !== telemetry.deviceId) {
    return {
      ok: false,
      statusCode: 400,
      code: "topic_device_mismatch",
      details: [topicResult.deviceIdFromTopic, telemetry.deviceId]
    };
  }

  const device = await findDevice(telemetry.deviceId);
  if (!device) {
    return {
      ok: false,
      statusCode: 404,
      code: "device_unknown",
      details: [telemetry.deviceId]
    };
  }

  if (device.provisioning_state === "retired") {
    return {
      ok: false,
      statusCode: 409,
      code: "device_retired",
      details: [telemetry.deviceId]
    };
  }

  const persisted = await persist(device, telemetry);
  const alertResults = await evaluateAlerts(device, telemetry);
  return {
    ok: true,
    statusCode: persisted.duplicate ? 200 : 201,
    code: persisted.duplicate ? "accepted_duplicate" : "accepted",
    result: {
      deviceId: telemetry.deviceId,
      topic: envelope?.topic ?? `${config.values.MQTT_TOPIC_PREFIX}/${telemetry.deviceId}/telemetry`,
      duplicate: persisted.duplicate,
      recordedAt: telemetry.recordedAt,
      alertsEvaluated: alertResults.length
    }
  };
}
