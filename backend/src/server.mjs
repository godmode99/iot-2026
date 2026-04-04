import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateOfflineAlerts } from "./alerts/service.mjs";
import { getBackendConfig } from "./config.mjs";
import { ingestTelemetryEnvelope } from "./ingest/service.mjs";
import {
  bindProvisioningTarget,
  resolveProvisioningTarget
} from "./provisioning/service.mjs";
import {
  getDeviceAlerts,
  getDeviceDetail,
  getDeviceTelemetryHistory,
  listAlertSummaries,
  listDevicesWithStatus
} from "./read-models.mjs";

const config = getBackendConfig();
const currentDir = dirname(fileURLToPath(import.meta.url));
const telemetrySchemaPath = resolve(currentDir, "..", "..", "shared", "contracts", "telemetry.schema.json");
const deviceIdentitySchemaPath = resolve(currentDir, "..", "..", "shared", "contracts", "device-identity.schema.json");
const batteryProfilePath = resolve(currentDir, "..", "..", "shared", "contracts", "battery-profile.json");

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        rejectBody(new Error("payload_too_large"));
      }
    });

    request.on("end", () => {
      if (!raw) {
        resolveBody({});
        return;
      }

      try {
        resolveBody(JSON.parse(raw));
      } catch (error) {
        rejectBody(error);
      }
    });

    request.on("error", rejectBody);
  });
}

function sendError(response, statusCode, code, details = []) {
  sendJson(response, statusCode, {
    ok: false,
    code,
    details
  });
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "missing_url" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? `localhost:${config.port}`}`);

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      service: "backend",
      ok: true,
      port: config.port,
      missingEnv: config.missing
    });
    return;
  }

  if (url.pathname === "/api/contracts") {
    sendJson(response, 200, {
      telemetry: JSON.parse(readFileSync(telemetrySchemaPath, "utf8")),
      deviceIdentity: JSON.parse(readFileSync(deviceIdentitySchemaPath, "utf8")),
      batteryProfiles: JSON.parse(readFileSync(batteryProfilePath, "utf8"))
    });
    return;
  }

  if (url.pathname === "/api/ingest-placeholder") {
    sendJson(response, 200, {
      message: "Use POST /api/ingest/telemetry for the real EX-07 ingest path.",
      mqttTopicPrefix: config.values.MQTT_TOPIC_PREFIX
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/devices") {
    try {
      const devices = await listDevicesWithStatus();
      sendJson(response, 200, {
        ok: true,
        devices
      });
      return;
    } catch (error) {
      console.error("[read-model] devices_failed", error);
      sendError(response, 500, "devices_query_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/alerts") {
    try {
      const status = url.searchParams.get("status") ?? "open";
      const alerts = await listAlertSummaries(status);
      sendJson(response, 200, {
        ok: true,
        alerts
      });
      return;
    } catch (error) {
      console.error("[read-model] alerts_failed", error);
      sendError(response, 500, "alerts_query_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/alerts/evaluate-offline") {
    try {
      const alerts = await evaluateOfflineAlerts();
      sendJson(response, 200, {
        ok: true,
        evaluated: alerts.length
      });
      return;
    } catch (error) {
      console.error("[alerts] offline_evaluation_failed", error);
      sendError(response, 500, "offline_evaluation_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/provisioning/resolve") {
    try {
      const result = await resolveProvisioningTarget({
        qr: url.searchParams.get("qr"),
        deviceId: url.searchParams.get("device_id"),
        actorUserId: url.searchParams.get("actor_user_id")
      });

      if (!result.ok) {
        sendError(response, result.statusCode, result.code, result.details ?? []);
        return;
      }

      sendJson(response, result.statusCode, {
        ok: true,
        code: result.code,
        result: result.result
      });
      return;
    } catch (error) {
      console.error("[provisioning] resolve_failed", error);
      sendError(response, 500, "provisioning_resolve_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/provisioning/bind") {
    try {
      const body = await readJsonBody(request);
      const result = await bindProvisioningTarget({
        qr: body?.qr ?? null,
        deviceId: body?.device_id ?? null,
        farmId: body?.farm_id ?? null,
        actorUserId: body?.actor_user_id ?? null
      });

      if (!result.ok) {
        sendError(response, result.statusCode, result.code, result.details ?? []);
        return;
      }

      sendJson(response, result.statusCode, {
        ok: true,
        code: result.code,
        result: result.result
      });
      return;
    } catch (error) {
      console.error("[provisioning] bind_failed", error);
      sendError(response, 500, "provisioning_bind_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/devices/") && url.pathname.endsWith("/history")) {
    const deviceId = decodeURIComponent(url.pathname.split("/")[3] ?? "");
    const hours = Number(url.searchParams.get("hours") ?? 24);

    try {
      const history = await getDeviceTelemetryHistory(deviceId, Number.isFinite(hours) ? hours : 24);
      sendJson(response, 200, {
        ok: true,
        deviceId,
        history
      });
      return;
    } catch (error) {
      console.error("[read-model] history_failed", error);
      sendError(response, 500, "history_query_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/devices/") && url.pathname.endsWith("/alerts")) {
    const deviceId = decodeURIComponent(url.pathname.split("/")[3] ?? "");

    try {
      const alerts = await getDeviceAlerts(deviceId, url.searchParams.get("status") ?? "all");
      sendJson(response, 200, {
        ok: true,
        deviceId,
        alerts
      });
      return;
    } catch (error) {
      console.error("[read-model] device_alerts_failed", error);
      sendError(response, 500, "device_alerts_query_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/devices/")) {
    const deviceId = decodeURIComponent(url.pathname.split("/")[3] ?? "");

    try {
      const device = await getDeviceDetail(deviceId);
      if (!device) {
        sendError(response, 404, "device_not_found", [deviceId]);
        return;
      }

      sendJson(response, 200, {
        ok: true,
        device
      });
      return;
    } catch (error) {
      console.error("[read-model] device_failed", error);
      sendError(response, 500, "device_query_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/ingest/telemetry") {
    try {
      const body = await readJsonBody(request);
      const result = await ingestTelemetryEnvelope(config, body);

      if (!result.ok) {
        console.error("[ingest] rejected", result.code, result.details ?? []);
        sendError(response, result.statusCode, result.code, result.details ?? []);
        return;
      }

      console.log("[ingest] accepted", result.code, result.result);
      sendJson(response, result.statusCode, {
        ok: true,
        code: result.code,
        result: result.result
      });
      return;
    } catch (error) {
      console.error("[ingest] failed", error);
      sendError(response, 500, "ingest_failed", [error instanceof Error ? error.message : "unknown_error"]);
      return;
    }
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
