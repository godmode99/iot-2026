import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateOfflineAlerts } from "./alerts/service.mjs";
import { adminUpdateAlertStatus } from "./alerts/admin-service.mjs";
import { authorizeAdminRequest } from "./admin/auth.mjs";
import {
  acknowledgeCommandResult,
  enqueueDeviceCommand,
  fetchPendingCommandsForDevice,
  getFarmNotificationTargets,
  getRecentCommandLog,
  saveFarmNotificationTargets
} from "./admin/service.mjs";
import { getBackendConfig } from "./config.mjs";
import { authorizeIngestRequest } from "./ingest/auth.mjs";
import { ingestTelemetryEnvelope } from "./ingest/service.mjs";
import { resolveOtaManifest } from "./ota/service.mjs";
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
import {
  acceptInvite,
  assignResellerToFarm,
  createFarmMemberInvite,
  getAuditLog,
  getFarmMembers,
  getNotificationPreferences,
  getResellerAssignments,
  saveNotificationPreference
} from "./rbac/service.mjs";

const config = getBackendConfig();
const currentDir = dirname(fileURLToPath(import.meta.url));
const telemetrySchemaPath = resolve(currentDir, "..", "..", "shared", "contracts", "telemetry.schema.json");
const deviceIdentitySchemaPath = resolve(currentDir, "..", "..", "shared", "contracts", "device-identity.schema.json");
const batteryProfilePath = resolve(currentDir, "..", "..", "shared", "contracts", "battery-profile.json");

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

function sendError(response, statusCode, code, details = []) {
  sendJson(response, statusCode, {
    ok: false,
    code,
    details
  });
}

function getRequestId(request) {
  const headerValue = request.headers["x-request-id"];
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }

  return randomUUID();
}

function logRequest(configValue, level, event, payload) {
  if (!configValue) {
    return;
  }

  const line = `[backend:${level}] ${event} ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

const server = createServer(async (request, response) => {
  const requestId = getRequestId(request);

  if (!request.url) {
    sendJson(response, 400, { error: "missing_url", requestId });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? `localhost:${config.port}`}`);

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      service: "backend",
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

  if (url.pathname === "/api/ingest-placeholder") {
    sendJson(response, 200, {
      message: "Use POST /api/ingest/telemetry for the real EX-07 ingest path.",
      mqttTopicPrefix: config.values.MQTT_TOPIC_PREFIX,
      requestId
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/devices") {
    try {
      const devices = await listDevicesWithStatus();
      sendJson(response, 200, {
        ok: true,
        devices,
        requestId
      });
      return;
    } catch (error) {
      console.error("[read-model] devices_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "devices_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/alerts") {
    try {
      const status = url.searchParams.get("status") ?? "open";
      const alerts = await listAlertSummaries(status);
      sendJson(response, 200, {
        ok: true,
        alerts,
        requestId
      });
      return;
    } catch (error) {
      console.error("[read-model] alerts_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "alerts_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/device/commands") {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
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

  if (request.method === "GET" && url.pathname === "/api/admin/command-log") {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    try {
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const commands = await getRecentCommandLog({
        limit: Number.isFinite(limit) ? limit : 50,
        deviceId: url.searchParams.get("device_id")
      });
      sendJson(response, 200, {
        ok: true,
        commands,
        requestId
      });
      return;
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "command_log_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/admin/farms/notification-targets") {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    try {
      const farms = await getFarmNotificationTargets();
      sendJson(response, 200, {
        ok: true,
        farms,
        requestId
      });
      return;
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "farm_notification_targets_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/admin/audit-log") {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    try {
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const result = await getAuditLog({
        farmId: url.searchParams.get("farm_id"),
        limit: Number.isFinite(limit) ? limit : 50
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
        code: "audit_log_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/farm-invites/accept") {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const result = await acceptInvite({
        inviteToken: body?.invite_token ?? "",
        acceptedBy: body?.accepted_by ?? auth.actorUserId ?? "",
        acceptedEmail: body?.accepted_email ?? ""
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
        code: "farm_invite_accept_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (url.pathname.startsWith("/api/admin/farms/")) {
    const segments = url.pathname.split("/");
    const farmId = decodeURIComponent(segments[4] ?? "");
    const resource = segments[5] ?? "";
    const resourceId = segments[6] ? decodeURIComponent(segments[6]) : null;

    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    try {
      if (request.method === "GET" && resource === "members") {
        const result = await getFarmMembers({ farmId });
        sendJson(response, result.statusCode, {
          ok: result.ok,
          code: result.code,
          result: result.result ?? null,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      if (request.method === "POST" && resource === "invites") {
        const body = await readJsonBody(request);
        const result = await createFarmMemberInvite({
          farmId,
          email: body?.email ?? "",
          permissions: body?.permissions ?? {},
          invitedBy: auth.actorUserId ?? body?.invited_by ?? ""
        });

        sendJson(response, result.statusCode, {
          ok: result.ok,
          code: result.code,
          result: result.result ?? null,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      if (request.method === "GET" && resource === "resellers") {
        const result = await getResellerAssignments({ farmId });
        sendJson(response, result.statusCode, {
          ok: result.ok,
          code: result.code,
          result: result.result ?? null,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      if (request.method === "POST" && resource === "resellers") {
        const body = await readJsonBody(request);
        const result = await assignResellerToFarm({
          farmId,
          resellerUserId: body?.reseller_user_id ?? "",
          canManageAlerts: body?.can_manage_alerts ?? false,
          canSendSafeCommands: body?.can_send_safe_commands ?? false,
          assignedBy: auth.actorUserId ?? body?.assigned_by ?? null
        });

        sendJson(response, result.statusCode, {
          ok: result.ok,
          code: result.code,
          result: result.result ?? null,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      if (request.method === "GET" && resource === "notification-preferences") {
        const result = await getNotificationPreferences({ farmId });
        sendJson(response, result.statusCode, {
          ok: result.ok,
          code: result.code,
          result: result.result ?? null,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      if ((request.method === "PATCH" || request.method === "PUT") && resource === "notification-preferences") {
        const body = await readJsonBody(request);
        const result = await saveNotificationPreference({
          farmId,
          userId: resourceId ?? body?.user_id ?? "",
          emailEnabled: body?.email_enabled ?? true,
          lineEnabled: body?.line_enabled ?? false,
          criticalOnly: body?.critical_only ?? false,
          alertTypes: body?.alert_types ?? [],
          actorUserId: auth.actorUserId ?? body?.actor_user_id ?? null
        });

        sendJson(response, result.statusCode, {
          ok: result.ok,
          code: result.code,
          result: result.result ?? null,
          details: result.details ?? [],
          requestId
        });
        return;
      }
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        code: "farm_admin_action_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/admin/alerts/")) {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    const segments = url.pathname.split("/");
    const alertId = decodeURIComponent(segments[4] ?? "");
    const action = segments[5] ?? "";

    try {
      const body = await readJsonBody(request);
      const result = await adminUpdateAlertStatus({
        alertId,
        action,
        requestedBy: auth.actorUserId ?? body?.requested_by ?? null,
        note: body?.note ?? ""
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
        code: "alert_admin_action_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/alerts/evaluate-offline") {
    try {
      const alerts = await evaluateOfflineAlerts();
      sendJson(response, 200, {
        ok: true,
        evaluated: alerts.length,
        requestId
      });
      return;
    } catch (error) {
      console.error("[alerts] offline_evaluation_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "offline_evaluation_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/ota/manifest") {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
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

  if (request.method === "GET" && url.pathname === "/api/provisioning/resolve") {
    try {
      const result = await resolveProvisioningTarget({
        config,
        headers: request.headers,
        qr: url.searchParams.get("qr"),
        deviceId: url.searchParams.get("device_id"),
        actorUserId: url.searchParams.get("actor_user_id")
      });

      if (!result.ok) {
        sendJson(response, result.statusCode, {
          ok: false,
          code: result.code,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      sendJson(response, result.statusCode, {
        ok: true,
        code: result.code,
        result: result.result,
        requestId
      });
      return;
    } catch (error) {
      console.error("[provisioning] resolve_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "provisioning_resolve_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/provisioning/bind") {
    try {
      const body = await readJsonBody(request);
      const result = await bindProvisioningTarget({
        config,
        headers: request.headers,
        qr: body?.qr ?? null,
        deviceId: body?.device_id ?? null,
        farmId: body?.farm_id ?? null,
        actorUserId: body?.actor_user_id ?? null
      });

      if (!result.ok) {
        sendJson(response, result.statusCode, {
          ok: false,
          code: result.code,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      sendJson(response, result.statusCode, {
        ok: true,
        code: result.code,
        result: result.result,
        requestId
      });
      return;
    } catch (error) {
      console.error("[provisioning] bind_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "provisioning_bind_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/admin/devices/") && url.pathname.endsWith("/commands")) {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    const deviceId = decodeURIComponent(url.pathname.split("/")[4] ?? "");

    try {
      const body = await readJsonBody(request);
      const result = await enqueueDeviceCommand({
        deviceId,
        commandType: body?.command_type ?? "",
        requestedBy: auth.actorUserId ?? body?.requested_by ?? null,
        requestSource: "admin_api",
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
        code: "command_queue_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "PATCH" && url.pathname.startsWith("/api/admin/farms/") && url.pathname.endsWith("/notification-targets")) {
    const auth = authorizeAdminRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    const farmId = decodeURIComponent(url.pathname.split("/")[4] ?? "");

    try {
      const body = await readJsonBody(request);
      const result = await saveFarmNotificationTargets({
        farmId,
        alertEmailTo: body?.alert_email_to ?? null,
        alertLineUserId: body?.alert_line_user_id ?? null
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
        code: "farm_notification_targets_update_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/device/commands/") && url.pathname.endsWith("/ack")) {
    const auth = authorizeIngestRequest(config, request.headers);
    if (!auth.ok) {
      sendJson(response, auth.statusCode, {
        ok: false,
        code: auth.code,
        details: auth.details ?? [],
        requestId
      });
      return;
    }

    const commandId = decodeURIComponent(url.pathname.split("/")[4] ?? "");

    try {
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

  if (request.method === "GET" && url.pathname.startsWith("/api/devices/") && url.pathname.endsWith("/history")) {
    const deviceId = decodeURIComponent(url.pathname.split("/")[3] ?? "");
    const hours = Number(url.searchParams.get("hours") ?? 24);

    try {
      const history = await getDeviceTelemetryHistory(deviceId, Number.isFinite(hours) ? hours : 24);
      sendJson(response, 200, {
        ok: true,
        deviceId,
        history,
        requestId
      });
      return;
    } catch (error) {
      console.error("[read-model] history_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "history_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
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
        alerts,
        requestId
      });
      return;
    } catch (error) {
      console.error("[read-model] device_alerts_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "device_alerts_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/devices/")) {
    const deviceId = decodeURIComponent(url.pathname.split("/")[3] ?? "");

    try {
      const device = await getDeviceDetail(deviceId);
      if (!device) {
        sendJson(response, 404, {
          ok: false,
          code: "device_not_found",
          details: [deviceId],
          requestId
        });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        device,
        requestId
      });
      return;
    } catch (error) {
      console.error("[read-model] device_failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "device_query_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/ingest/telemetry") {
    try {
      const auth = authorizeIngestRequest(config, request.headers);
      if (!auth.ok) {
        logRequest(config.requestLoggingEnabled, "error", "ingest.auth_rejected", {
          requestId,
          code: auth.code,
          remoteAddress: request.socket.remoteAddress ?? "unknown"
        });
        sendJson(response, auth.statusCode, {
          ok: false,
          code: auth.code,
          details: auth.details ?? [],
          requestId
        });
        return;
      }

      const body = await readJsonBody(request);
      const result = await ingestTelemetryEnvelope(config, body);

      if (!result.ok) {
        logRequest(config.requestLoggingEnabled, "error", "ingest.rejected", {
          requestId,
          code: result.code,
          details: result.details ?? [],
          authMode: auth.mode,
          remoteAddress: request.socket.remoteAddress ?? "unknown"
        });
        sendJson(response, result.statusCode, {
          ok: false,
          code: result.code,
          details: result.details ?? [],
          requestId
        });
        return;
      }

      logRequest(config.requestLoggingEnabled, "info", "ingest.accepted", {
        requestId,
        code: result.code,
        authMode: auth.mode,
        duplicate: result.result?.duplicate ?? false,
        deviceId: result.result?.deviceId ?? null,
        remoteAddress: request.socket.remoteAddress ?? "unknown"
      });
      sendJson(response, result.statusCode, {
        ok: true,
        code: result.code,
        result: result.result,
        requestId
      });
      return;
    } catch (error) {
      console.error("[ingest] failed", error);
      sendJson(response, 500, {
        ok: false,
        code: "ingest_failed",
        details: [error instanceof Error ? error.message : "unknown_error"],
        requestId
      });
      return;
    }
  }

  sendJson(response, 404, {
    error: "not_found",
    service: "backend",
    requestId
  });
});

server.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
  console.log(`[backend] missing env vars: ${config.missing.length ? config.missing.join(", ") : "none"}`);
});
