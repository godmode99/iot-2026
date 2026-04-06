import { getBatteryThresholds } from "./battery-profiles.mjs";
import {
  annotateAlertNotification,
  listOfflineCandidates,
  openOrRefreshAlert,
  resolveAlert,
  setDeviceOnlineState
} from "./repository.mjs";
import { getBackendConfig } from "../config.mjs";
import { dispatchAlertNotification } from "../notifications/service.mjs";

const config = getBackendConfig();

function nowIso() {
  return new Date().toISOString();
}

function readPreviousNotificationMetadata(resultLike) {
  return resultLike?.previous?.details_json?.notification ?? null;
}

function shouldNotify(resultLike, decisionSeverity) {
  if (!resultLike) {
    return false;
  }

  if (resultLike.action === "opened") {
    return true;
  }

  const previousSeverity = resultLike.previous?.severity ?? null;
  if (previousSeverity && previousSeverity !== decisionSeverity) {
    return true;
  }

  const notification = readPreviousNotificationMetadata(resultLike);
  if (!notification?.lastActionAt) {
    return true;
  }

  const lastActionMs = new Date(notification.lastActionAt).getTime();
  const cooldownMs = Math.max(60, Number(config.alertNotifyMinIntervalSec || 900)) * 1000;
  return Number.isFinite(lastActionMs) && Date.now() - lastActionMs >= cooldownMs;
}

async function maybeNotify(resultLike, action, alertType, device, severity, dependencies = {}) {
  const {
    annotateNotification = annotateAlertNotification,
    dispatchNotification = dispatchAlertNotification
  } = dependencies;

  if (!shouldNotify(resultLike, severity)) {
    return false;
  }

  const notificationResult = await dispatchNotification({
    alertId: resultLike.alert?.id ?? null,
    alertType,
    action,
    severity,
    device
  }, dependencies);

  const lastActionAt = notificationResult.sentAt ?? nowIso();
  if (resultLike.alert?.id) {
    await annotateNotification(resultLike.alert.id, {
      channel: notificationResult.channel,
      deliveryStatus: notificationResult.deliveryStatus,
      lastActionAt,
      lastAction: action,
      severity
    });
  }
  return true;
}

function thresholdDecision(telemetry) {
  if (telemetry.temperatureC !== null && telemetry.temperatureC >= 32) {
    return {
      open: true,
      severity: telemetry.temperatureC >= 36 ? "critical" : "warning",
      details: {
        rule: "temperature_high",
        value: telemetry.temperatureC,
        triggeredAt: telemetry.recordedAt
      }
    };
  }

  if (telemetry.turbidityRaw !== null && telemetry.turbidityRaw >= 2000) {
    return {
      open: true,
      severity: telemetry.turbidityRaw >= 3000 ? "critical" : "warning",
      details: {
        rule: "turbidity_high",
        value: telemetry.turbidityRaw,
        triggeredAt: telemetry.recordedAt
      }
    };
  }

  return {
    open: false,
    details: {
      reason: "value_back_in_range",
      clearedAt: telemetry.recordedAt
    }
  };
}

function lowBatteryDecision(device, telemetry) {
  const thresholds = getBatteryThresholds(telemetry.batteryVariant ?? device.battery_variant);

  if (telemetry.batteryPercent === null) {
    return {
      open: false,
      details: {
        reason: "battery_percent_unavailable",
        clearedAt: telemetry.recordedAt
      }
    };
  }

  if (telemetry.batteryPercent <= thresholds.low_battery_critical_pct) {
    return {
      open: true,
      severity: "critical",
      details: {
        batteryVariant: telemetry.batteryVariant ?? device.battery_variant,
        threshold: thresholds.low_battery_critical_pct,
        value: telemetry.batteryPercent,
        triggeredAt: telemetry.recordedAt
      }
    };
  }

  if (telemetry.batteryPercent <= thresholds.low_battery_warn_pct) {
    return {
      open: true,
      severity: "warning",
      details: {
        batteryVariant: telemetry.batteryVariant ?? device.battery_variant,
        threshold: thresholds.low_battery_warn_pct,
        value: telemetry.batteryPercent,
        triggeredAt: telemetry.recordedAt
      }
    };
  }

  return {
    open: false,
    details: {
      reason: "battery_recovered",
      clearedAt: telemetry.recordedAt
    }
  };
}

function sensorFaultDecision(telemetry) {
  const failedFields = [];

  if (telemetry.temperatureC === null) {
    failedFields.push("temperature_c");
  }
  if (telemetry.turbidityRaw === null) {
    failedFields.push("turbidity_raw");
  }
  if (telemetry.batteryPercent === null) {
    failedFields.push("battery_percent");
  }
  if (telemetry.batteryMv === null) {
    failedFields.push("battery_mv");
  }
  if (telemetry.lat === null || telemetry.lng === null) {
    failedFields.push("gps");
  }

  if (failedFields.length > 0) {
    return {
      open: true,
      severity: "warning",
      details: {
        failedFields,
        triggeredAt: telemetry.recordedAt
      }
    };
  }

  return {
    open: false,
    details: {
      reason: "sensor_values_restored",
      clearedAt: telemetry.recordedAt
    }
  };
}

async function applyDecision(device, alertType, decision, dependencies = {}) {
  if (!device.farm_id) {
    return null;
  }

  if (decision.open) {
    const result = await (dependencies.openOrRefreshAlert ?? openOrRefreshAlert)(
      device,
      alertType,
      decision.severity,
      decision.details
    );
    await maybeNotify(result, result.action, alertType, device, decision.severity, dependencies);
    return result;
  }

  const resolved = await (dependencies.resolveAlert ?? resolveAlert)(device.id, alertType, decision.details);
  if (resolved) {
    await maybeNotify({ action: "resolved", alert: resolved, previous: resolved.previous }, "resolved", alertType, device, resolved.severity, dependencies);
  }
  return resolved;
}

export async function evaluateAlertsForTelemetry(device, telemetry, dependencies = {}) {
  const results = [];

  results.push(await applyDecision(device, "threshold", thresholdDecision(telemetry), dependencies));
  results.push(await applyDecision(device, "low_battery", lowBatteryDecision(device, telemetry), dependencies));
  results.push(await applyDecision(device, "sensor_fault", sensorFaultDecision(telemetry), dependencies));

  const offlineResolved = await (dependencies.resolveAlert ?? resolveAlert)(device.id, "offline", {
    reason: "telemetry_resumed",
    clearedAt: telemetry.recordedAt
  });
  if (offlineResolved) {
    await maybeNotify(
      { action: "resolved", alert: offlineResolved, previous: offlineResolved.previous },
      "resolved",
      "offline",
      device,
      offlineResolved.severity,
      dependencies
    );
    results.push(offlineResolved);
  }

  return results.filter(Boolean);
}

export async function evaluateOfflineAlerts(dependencies = {}) {
  const devices = await (dependencies.listOfflineCandidates ?? listOfflineCandidates)();
  const now = Date.now();
  const results = [];

  for (const device of devices) {
    if (!device.farm_id) {
      continue;
    }

    const thresholdSeconds = Math.max(900, Number(device.publish_interval_sec ?? 300) * 3);
    const lastSeenMs = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;
    const isOffline = !lastSeenMs || now - lastSeenMs > thresholdSeconds * 1000;

    if (isOffline) {
      await (dependencies.setDeviceOnlineState ?? setDeviceOnlineState)(device.id, "offline");
      const result = await (dependencies.openOrRefreshAlert ?? openOrRefreshAlert)(device, "offline", "warning", {
        thresholdSeconds,
        lastSeenAt: device.last_seen_at,
        evaluatedAt: nowIso()
      });
      await maybeNotify(result, result.action, "offline", device, "warning", dependencies);
      results.push(result);
      continue;
    }

    await (dependencies.setDeviceOnlineState ?? setDeviceOnlineState)(device.id, "online");
    const resolved = await (dependencies.resolveAlert ?? resolveAlert)(device.id, "offline", {
      reason: "fresh_last_seen",
      evaluatedAt: nowIso()
    });
    if (resolved) {
      await maybeNotify(
        { action: "resolved", alert: resolved, previous: resolved.previous },
        "resolved",
        "offline",
        device,
        resolved.severity,
        dependencies
      );
      results.push(resolved);
    }
  }

  return results;
}
