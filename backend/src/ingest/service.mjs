import { parseIngestTopic } from "./topic-parser.mjs";
import { validateTelemetryEnvelope } from "./validator.mjs";
import { findDeviceByDeviceId, persistTelemetryAndStatus } from "./repository.mjs";
import { evaluateAlertsForTelemetry } from "../alerts/service.mjs";

export async function ingestTelemetryEnvelope(config, envelope) {
  const topicResult = parseIngestTopic(envelope?.topic ?? null, config.values.MQTT_TOPIC_PREFIX);
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

  const validation = validateTelemetryEnvelope(envelope, config.values.MQTT_TOPIC_PREFIX);
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

  const device = await findDeviceByDeviceId(telemetry.deviceId);
  if (!device) {
    return {
      ok: false,
      statusCode: 404,
      code: "device_unknown",
      details: [telemetry.deviceId]
    };
  }

  const persisted = await persistTelemetryAndStatus(device, telemetry);
  const alertResults = await evaluateAlertsForTelemetry(device, telemetry);
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
