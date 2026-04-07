import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acknowledgeCommandResult,
  fetchPendingCommandsForDevice
} from "./admin/service.mjs";
import { getBackendConfig } from "./config.mjs";
import { authorizeIngestRequest } from "./ingest/auth.mjs";
import { ingestTelemetryEnvelope } from "./ingest/service.mjs";
import { resolveOtaManifest } from "./ota/service.mjs";
import {
  buildRateLimitConfig,
  createRateLimiter,
  getRateLimitKey,
  selectRateLimitPolicy
} from "./rate-limit.mjs";

const config = getBackendConfig();
const currentDir = dirname(fileURLToPath(import.meta.url));
const telemetrySchemaPath = resolve(currentDir, "..", "..", "shared", "contracts", "telemetry.schema.json");
const deviceIdentitySchemaPath = resolve(currentDir, "..", "..", "shared", "contracts", "device-identity.schema.json");
const batteryProfilePath = resolve(currentDir, "..", "..", "shared", "contracts", "battery-profile.json");
const rateLimiter = createRateLimiter();
const rateLimitConfig = buildRateLimitConfig(process.env);

function sendJson(response, statusCode, body) {
  const headers = { "content-type": "application/json; charset=utf-8" };
  if (body?.requestId) {
    headers["x-request-id"] = body.requestId;
  }
  response.writeHead(statusCode, headers);
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

function getRequestId(request) {
  const headerValue = request.headers["x-request-id"];
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }

  return randomUUID();
}

function logRequest(enabled, level, event, payload) {
  if (!enabled) {
    return;
  }

  const line = `[device-worker:${level}] ${event} ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

function enforceRateLimit({ request, response, url, requestId }) {
  const policy = selectRateLimitPolicy({
    method: request.method ?? "GET",
    pathname: url.pathname
  }, {
    ...rateLimitConfig,
    enabled: config.rateLimitEnabled
  });

  if (!policy) {
    return true;
  }

  const result = rateLimiter.check({
    key: getRateLimitKey({
      remoteAddress: request.socket.remoteAddress,
      method: request.method ?? "GET",
      pathname: url.pathname,
      bucket: policy.bucket
    }),
    policy
  });

  if (result.allowed) {
    return true;
  }

  response.setHeader("retry-after", String(result.retryAfterSec));
  sendJson(response, 429, {
    ok: false,
    code: "rate_limited",
    details: [`retry_after_seconds:${result.retryAfterSec}`],
    requestId
  });
  return false;
}

function sendAuthFailure(response, auth, requestId) {
  sendJson(response, auth.statusCode, {
    ok: false,
    code: auth.code,
    details: auth.details ?? [],
    requestId
  });
}

const server = createServer(async (request, response) => {
  const requestId = getRequestId(request);

  if (!request.url) {
    sendJson(response, 400, { ok: false, code: "missing_url", requestId });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? `localhost:${config.port}`}`);
  if (!enforceRateLimit({ request, response, url, requestId })) {
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      service: "device-worker",
      ok: true,
      port: config.port,
      missingEnv: config.missing,
      requestId
    });
    return;
  }

  if (url.pathname === "/api/contracts") {
    sendJson(response, 200, {
      telemetry: JSON.parse(readFileSync(telemetrySchemaPath, "utf8")),
      deviceIdentity: JSON.parse(readFileSync(deviceIdentitySchemaPath, "utf8")),
      batteryProfiles: JSON.parse(readFileSync(batteryProfilePath, "utf8")),
      requestId
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ingest/telemetry") {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      logRequest(config.requestLoggingEnabled, "error", "ingest.auth_rejected", {
        requestId,
        code: auth.code,
        remoteAddress: request.socket.remoteAddress ?? "unknown"
      });
      sendAuthFailure(response, auth, requestId);
      return;
    }

    try {
      const body = await readJsonBody(request);
      const result = await ingestTelemetryEnvelope(config, body);
      logRequest(config.requestLoggingEnabled, result.ok ? "info" : "error", result.ok ? "ingest.accepted" : "ingest.rejected", {
        requestId,
        code: result.code,
        deviceId: result.result?.deviceId ?? null,
        duplicate: result.result?.duplicate ?? false,
        authMode: auth.mode
      });
      sendJson(response, result.statusCode, {
        ok: result.ok,
        code: result.code,
        result: result.result ?? null,
        details: result.details ?? [],
        requestId
      });
      return;
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "ingest_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/device/commands") {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      sendAuthFailure(response, auth, requestId);
      return;
    }

    try {
      const result = await fetchPendingCommandsForDevice({
        deviceId: url.searchParams.get("device_id") ?? "",
        limit: Number(url.searchParams.get("limit") ?? 20)
      });
      sendJson(response, result.statusCode, {
        ok: result.ok,
        code: result.code,
        result: result.result ?? null,
        details: result.details ?? [],
        requestId
      });
      return;
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "device_command_fetch_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/device/commands/") && url.pathname.endsWith("/ack")) {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      sendAuthFailure(response, auth, requestId);
      return;
    }

    try {
      const commandId = decodeURIComponent(url.pathname.split("/")[4] ?? "");
      const body = await readJsonBody(request);
      const result = await acknowledgeCommandResult({
        commandId,
        deviceId: body?.device_id ?? "",
        status: body?.status ?? "",
        details: body?.details ?? {}
      });
      sendJson(response, result.statusCode, {
        ok: result.ok,
        code: result.code,
        result: result.result ?? null,
        details: result.details ?? [],
        requestId
      });
      return;
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "device_command_ack_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/ota/manifest") {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      sendAuthFailure(response, auth, requestId);
      return;
    }

    try {
      const result = resolveOtaManifest(config, {
        deviceId: url.searchParams.get("device_id"),
        currentVersion: url.searchParams.get("current_version"),
        batteryVariant: url.searchParams.get("battery_variant"),
        channel: url.searchParams.get("channel")
      });
      sendJson(response, result.statusCode, {
        ok: result.ok,
        code: result.code,
        result: result.result ?? null,
        details: result.details ?? [],
        requestId
      });
      return;
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "ota_manifest_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  sendJson(response, 404, {
    ok: false,
    code: "not_found",
    service: "device-worker",
    requestId
  });
});

server.listen(config.port, () => {
  console.log(`[device-worker] listening on 0.0.0.0:${config.port}`);
  console.log(`[device-worker] missing env vars: ${config.missing.length ? config.missing.join(", ") : "none"}`);
});
