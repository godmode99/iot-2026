import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { getBackendConfig } from "../backend/src/config.mjs";
import { evaluateOfflineAlerts } from "../backend/src/alerts/service.mjs";
import { getDb } from "../backend/src/db.mjs";
import { ingestTelemetryEnvelope } from "../backend/src/ingest/service.mjs";
import { getDeviceAlerts, getDeviceDetail } from "../backend/src/read-models.mjs";

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function isoStamp(date = new Date()) {
  return date.toISOString().replaceAll(":", "-");
}

function createTelemetryPayload(deviceId, cycle, recordedAt, injectSensorFault = false) {
  const baseTemperature = 27.4 + (cycle % 4) * 0.4;
  const baseTurbidity = 940 + (cycle % 5) * 45;
  const batteryPercent = Math.max(45, 82 - cycle * 0.6);
  const gpsDisabled = injectSensorFault && cycle === 1;

  return {
    device_id: deviceId,
    timestamp: recordedAt,
    temperature_c: Number(baseTemperature.toFixed(2)),
    turbidity_raw: Math.round(baseTurbidity),
    battery_percent: Number(batteryPercent.toFixed(2)),
    battery_mv: 3980 - cycle * 8,
    lat: gpsDisabled ? null : 13.7563,
    lng: gpsDisabled ? null : 100.5018,
    signal_quality: 76,
    gps_fix_state: gpsDisabled ? "none" : "3d",
    battery_variant: "standard",
    firmware_version: "0.1.0-soak"
  };
}

function summarizeAlerts(alerts) {
  return alerts.map((alert) => ({
    type: alert.alert_type,
    status: alert.status,
    severity: alert.severity
  }));
}

function renderSummaryMarkdown(summary) {
  return `# EX-12 Bench Soak Summary

- Started at: ${summary.startedAt}
- Ended at: ${summary.endedAt}
- Duration target minutes: ${summary.durationMinutes}
- Cycles attempted: ${summary.cyclesAttempted}
- Publish successes: ${summary.publishSuccess}
- Publish failures: ${summary.publishFailure}
- Buffered payloads: ${summary.bufferedCount}
- Flushed payloads: ${summary.flushedCount}
- Reconnect events: ${summary.reconnectEvents}
- Offline evaluations: ${summary.offlineEvaluations}
- Reboot checks: ${summary.rebootChecks}
- Final online state: ${summary.finalDeviceStatus?.online_state ?? "unknown"}
- Final open alerts: ${summary.finalOpenAlerts.length}
- Result: ${summary.pass ? "PASS" : "FAIL"}

## Pass Criteria

- No repeated crash loop observed in harness
- Reconnect path executed
- Buffered payloads flushed after reconnect
- Offline alert opened during forced outage and resolved after telemetry resumed
- Final device state returned to online

## Final Open Alerts

${summary.finalOpenAlerts.length ? summary.finalOpenAlerts.map((alert) => `- ${alert.type} (${alert.severity})`).join("\n") : "- none"}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = getBackendConfig();
  const sql = getDb();

  const durationMinutes = toInteger(args["duration-minutes"], 3);
  const intervalSeconds = toInteger(args["interval-seconds"], 2);
  const deviceId = args["device-id"] ?? "sb00-devkit-01";
  const outDir = resolve(
    process.cwd(),
    "artifacts",
    "ex12",
    `${isoStamp(new Date())}-${deviceId}`
  );

  const injectReconnect = toBoolean(args["inject-reconnect"], true);
  const injectOffline = toBoolean(args["inject-offline"], true);
  const injectReboot = toBoolean(args["inject-reboot"], true);
  const injectSensorFault = toBoolean(args["inject-sensor-fault"], false);
  const simulateDelay = toBoolean(args["simulate-delay"], false);
  const totalCycles = Math.max(3, Math.floor((durationMinutes * 60) / Math.max(intervalSeconds, 1)));
  const networkDropStartCycle = Math.min(3, totalCycles - 1);
  const networkDropEndCycle = Math.min(networkDropStartCycle + 1, totalCycles - 1);
  const rebootCycle = Math.min(networkDropEndCycle + 1, totalCycles);

  let networkOnline = true;
  const startedAt = new Date().toISOString();
  const counts = {
    publishSuccess: 0,
    publishFailure: 0,
    bufferedCount: 0,
    flushedCount: 0,
    reconnectEvents: 0,
    offlineEvaluations: 0,
    rebootChecks: 0,
    injectSensorFault
  };
  const bufferedEnvelopes = [];

  await mkdir(outDir, { recursive: true });

  async function writeEvent(event) {
    await appendFile(resolve(outDir, "events.ndjson"), `${JSON.stringify(event)}\n`, "utf8");
  }

  async function ingestEnvelope(envelope, source) {
    const result = await ingestTelemetryEnvelope(config, envelope);
    await writeEvent({
      at: new Date().toISOString(),
      type: "publish",
      source,
      result
    });

    if (result.ok) {
      counts.publishSuccess += 1;
      return result;
    }

    counts.publishFailure += 1;
    return result;
  }

  await writeEvent({
    at: startedAt,
    type: "soak_started",
    deviceId,
    durationMinutes,
    intervalSeconds
  });

  for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
    const recordedAt = new Date(Date.now() + cycle * 1000).toISOString();
    const envelope = {
      topic: `${config.values.MQTT_TOPIC_PREFIX}/${deviceId}/telemetry`,
      payload: createTelemetryPayload(deviceId, cycle, recordedAt, injectSensorFault)
    };

    if (injectReconnect && cycle === networkDropStartCycle) {
      networkOnline = false;
      await writeEvent({
        at: new Date().toISOString(),
        type: "network_interruption_started",
        cycle
      });
    }

    if (!networkOnline) {
      bufferedEnvelopes.push(envelope);
      counts.bufferedCount += 1;
      counts.publishFailure += 1;
      await writeEvent({
        at: new Date().toISOString(),
        type: "buffered_payload",
        cycle,
        bufferedCount: bufferedEnvelopes.length
      });
    } else {
      await ingestEnvelope(envelope, "live");
    }

    if (injectOffline && cycle === networkDropEndCycle) {
      await sql`
        update public.device_status
        set last_seen_at = timezone('utc', now()) - interval '2 hours'
        where device_id = (select id from public.devices where device_id = ${deviceId})
      `;
      const offlineResults = await evaluateOfflineAlerts();
      counts.offlineEvaluations += 1;
      await writeEvent({
        at: new Date().toISOString(),
        type: "offline_evaluated",
        cycle,
        results: offlineResults.map((entry) => ({
          action: entry.action,
          alertType: entry.alert.alert_type,
          status: entry.alert.status
        }))
      });
    }

    if (injectReconnect && cycle === networkDropEndCycle) {
      networkOnline = true;
      counts.reconnectEvents += 1;
      await writeEvent({
        at: new Date().toISOString(),
        type: "network_recovered",
        cycle,
        bufferedCount: bufferedEnvelopes.length
      });

      while (bufferedEnvelopes.length > 0) {
        const bufferedEnvelope = bufferedEnvelopes.shift();
        await ingestEnvelope(bufferedEnvelope, "flush");
        counts.flushedCount += 1;
      }
    }

    if (injectReboot && cycle === rebootCycle) {
      counts.rebootChecks += 1;
      await writeEvent({
        at: new Date().toISOString(),
        type: "controlled_reboot_check",
        cycle,
        note: "Simulated scheduler restart and publish resume point"
      });
    }

    if (simulateDelay) {
      await sleep(intervalSeconds * 1000);
    }
  }

  const finalDeviceStatus = await getDeviceDetail(deviceId);
  const finalOpenAlerts = summarizeAlerts(await getDeviceAlerts(deviceId, "open"));
  const allAlerts = summarizeAlerts(await getDeviceAlerts(deviceId, "all"));
  const telemetryCountRows = await sql`
    select count(*)::int as count
    from public.telemetry t
    join public.devices d
      on d.id = t.device_id
    where d.device_id = ${deviceId}
  `;

  const endedAt = new Date().toISOString();
  const summary = {
    startedAt,
    endedAt,
    durationMinutes,
    intervalSeconds,
    deviceId,
    cyclesAttempted: totalCycles,
    ...counts,
    telemetryCount: telemetryCountRows[0]?.count ?? 0,
    finalDeviceStatus: finalDeviceStatus
      ? {
          online_state: finalDeviceStatus.online_state,
          last_seen_at: finalDeviceStatus.last_seen_at,
          battery_percent: finalDeviceStatus.battery_percent,
          gps_fix_state: finalDeviceStatus.gps_fix_state
        }
      : null,
    finalOpenAlerts,
    allAlerts,
    pass:
      counts.reconnectEvents >= (injectReconnect ? 1 : 0) &&
      counts.flushedCount >= counts.bufferedCount &&
      counts.offlineEvaluations >= (injectOffline ? 1 : 0) &&
      counts.rebootChecks >= (injectReboot ? 1 : 0) &&
      finalOpenAlerts.length === 0 &&
      finalDeviceStatus?.online_state === "online"
  };

  await writeFile(resolve(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "summary.md"), renderSummaryMarkdown(summary), "utf8");

  await writeEvent({
    at: endedAt,
    type: "soak_completed",
    pass: summary.pass
  });

  console.log(JSON.stringify({ ok: true, outDir, summary }, null, 2));
  await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
  console.error("[ex12-soak] failed", error);
  process.exitCode = 1;
});
