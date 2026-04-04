import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getBackendConfig } from "./config.mjs";

const config = getBackendConfig();
const telemetrySchemaPath = resolve(process.cwd(), "..", "shared", "contracts", "telemetry.schema.json");
const deviceIdentitySchemaPath = resolve(process.cwd(), "..", "shared", "contracts", "device-identity.schema.json");
const batteryProfilePath = resolve(process.cwd(), "..", "shared", "contracts", "battery-profile.json");

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

const server = createServer((request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "missing_url" });
    return;
  }

  if (request.url === "/health") {
    sendJson(response, 200, {
      service: "backend",
      ok: true,
      port: config.port,
      missingEnv: config.missing
    });
    return;
  }

  if (request.url === "/api/contracts") {
    sendJson(response, 200, {
      telemetry: JSON.parse(readFileSync(telemetrySchemaPath, "utf8")),
      deviceIdentity: JSON.parse(readFileSync(deviceIdentitySchemaPath, "utf8")),
      batteryProfiles: JSON.parse(readFileSync(batteryProfilePath, "utf8"))
    });
    return;
  }

  if (request.url === "/api/ingest-placeholder") {
    sendJson(response, 200, {
      message: "EX-07 will implement the real ingest path.",
      nextTask: "EX-06 and EX-07",
      mqttTopicPrefix: config.values.MQTT_TOPIC_PREFIX
    });
    return;
  }

  sendJson(response, 404, {
    error: "not_found",
    service: "backend"
  });
});

server.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
  console.log(`[backend] missing env vars: ${config.missing.length ? config.missing.join(", ") : "none"}`);
});

