import { getBatteryThresholds } from "./battery-profiles.mjs";
import {
  listOfflineCandidates,
  openOrRefreshAlert,
  resolveAlert,
  setDeviceOnlineState
} from "./repository.mjs";

function nowIso() {
  return new Date().toISOString();
}

async function notifyStub(action, alertType, device, severity) {
  console.log("[notify:stub]", {
    action,
    alertType,
    deviceId: device.device_id,
    severity,
    channel: "web_stub",
    at: nowIso()
  });
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

async function applyDecision(device, alertType, decision) {
  if (!device.farm_id) {
    return null;
  }

  if (decision.open) {
    const result = await openOrRefreshAlert(device, alertType, decision.severity, {
      ...decision.details,
      notification: {
        channel: "web_stub",
        lastActionAt: nowIso()
      }
    });
    await notifyStub(result.action, alertType, device, decision.severity);
    return result;
  }

  const resolved = await resolveAlert(device.id, alertType, decision.details);
  if (resolved) {
    await notifyStub("resolved", alertType, device, resolved.severity);
  }
  return resolved;
}

export async function evaluateAlertsForTelemetry(device, telemetry) {
  const results = [];

  results.push(await applyDecision(device, "threshold", thresholdDecision(telemetry)));
  results.push(await applyDecision(device, "low_battery", lowBatteryDecision(device, telemetry)));
  results.push(await applyDecision(device, "sensor_fault", sensorFaultDecision(telemetry)));

  const offlineResolved = await resolveAlert(device.id, "offline", {
    reason: "telemetry_resumed",
    clearedAt: telemetry.recordedAt
  });
  if (offlineResolved) {
    await notifyStub("resolved", "offline", device, offlineResolved.severity);
    results.push(offlineResolved);
  }

  return results.filter(Boolean);
}

export async function evaluateOfflineAlerts() {
  const devices = await listOfflineCandidates();
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
      await setDeviceOnlineState(device.id, "offline");
      const result = await openOrRefreshAlert(device, "offline", "warning", {
        thresholdSeconds,
        lastSeenAt: device.last_seen_at,
        evaluatedAt: nowIso()
      });
      await notifyStub(result.action, "offline", device, "warning");
      results.push(result);
      continue;
    }

    await setDeviceOnlineState(device.id, "online");
    const resolved = await resolveAlert(device.id, "offline", {
      reason: "fresh_last_seen",
      evaluatedAt: nowIso()
    });
    if (resolved) {
      await notifyStub("resolved", "offline", device, resolved.severity);
      results.push(resolved);
    }
  }

  return results;
}
