import { createServer } from "node:http";
import { getDashboardConfig } from "./config.mjs";

const config = getDashboardConfig();
const DEV_ACTOR_USER_ID = "11111111-1111-1111-1111-111111111111";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function labelBatteryVariant(value) {
  return value === "long_life" ? "Long-Life" : "Standard";
}

function formatDate(value) {
  if (!value) {
    return "No data";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function onlineClass(value) {
  return value === "online" ? "is-online" : value === "offline" ? "is-offline" : "is-stale";
}

function onlineLabel(value) {
  if (value === "online") {
    return "Online";
  }
  if (value === "offline") {
    return "Offline";
  }
  if (value === "stale") {
    return "Stale";
  }
  return "Unknown";
}

function formatMetric(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  return `${value}${suffix}`;
}

function formatAlertType(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function severityClass(value) {
  return value === "critical" ? "is-offline" : value === "warning" ? "is-stale" : "is-online";
}

function renderChart(history) {
  if (!history?.length) {
    return `<div class="empty-card">No recent telemetry yet.</div>`;
  }

  const values = history
    .map((row) => Number(row.temperature_c))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return `<div class="empty-card">No temperature history available.</div>`;
  }

  const width = 640;
  const height = 220;
  const padding = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  const points = history
    .map((row, index) => {
      const value = Number(row.temperature_c);
      if (!Number.isFinite(value)) {
        return null;
      }
      const x = padding + (index * (width - padding * 2)) / Math.max(history.length - 1, 1);
      const y = height - padding - ((value - min) / spread) * (height - padding * 2);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="Temperature history">
      <rect x="0" y="0" width="${width}" height="${height}" rx="20" fill="#f8faf4"></rect>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d3dccf" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d3dccf" />
      <polyline fill="none" stroke="#0e8a63" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      <text x="${padding}" y="${padding - 6}" fill="#53645c" font-size="12">Max ${max.toFixed(1)} C</text>
      <text x="${padding}" y="${height - 8}" fill="#53645c" font-size="12">Min ${min.toFixed(1)} C</text>
    </svg>
  `;
}

function renderMap(device) {
  if (device.last_lat === null || device.last_lng === null || device.last_lat === undefined || device.last_lng === undefined) {
    return `<div class="empty-card">No GPS fix available for this device yet.</div>`;
  }

  const lat = Number(device.last_lat);
  const lng = Number(device.last_lng);
  const bbox = `${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}`;
  const marker = `${lat}%2C${lng}`;

  return `
    <div class="map-shell">
      <iframe
        title="Device map"
        class="map-frame"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}"></iframe>
      <p class="map-meta">
        ${lat.toFixed(6)}, ${lng.toFixed(6)}
        <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}" target="_blank" rel="noreferrer">Open in map</a>
      </p>
    </div>
  `;
}

function renderAlerts(alerts) {
  if (!alerts?.length) {
    return `<div class="empty-card">No alerts in this view.</div>`;
  }

  return alerts
    .map(
      (alert) => `
        <div class="alert-row">
          <div>
            <div class="device-title">${escapeHtml(formatAlertType(alert.alert_type))}</div>
            <div class="device-subtitle">${escapeHtml(alert.serial_number || alert.device_id || "")}</div>
          </div>
          <div class="device-meta">
            <span class="pill ${severityClass(alert.severity)}">${escapeHtml(alert.severity)}</span>
            <span>${escapeHtml(alert.status)}</span>
            <span>${formatDate(alert.opened_at)}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function readFormBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        rejectBody(new Error("payload_too_large"));
      }
    });

    request.on("end", () => {
      const params = new URLSearchParams(raw);
      resolveBody(Object.fromEntries(params.entries()));
    });

    request.on("error", rejectBody);
  });
}

function provisioningStateLabel(value) {
  if (value === "already_bound") {
    return "Already bound";
  }
  if (value === "valid_unbound") {
    return "Ready to bind";
  }
  if (value === "success") {
    return "Bind complete";
  }
  if (value === "invalid") {
    return "Invalid or unknown QR";
  }
  if (value === "unauthorized") {
    return "Unauthorized";
  }
  return "Scan or paste QR";
}

function renderProvisioningPage({ qrValue, actorUserId, resolved, bindResult, error }) {
  const device = resolved?.device ?? null;
  const farms = resolved?.farms ?? [];
  const state = bindResult?.ok ? "success" : error ? "invalid" : resolved?.state ?? "idle";
  const selectedFarmId = resolved?.device?.farm_id ?? farms[0]?.id ?? "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SB-00 Provisioning</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f6ef;
        --panel: #ffffff;
        --ink: #10221b;
        --muted: #53645c;
        --line: #d7ddd3;
        --accent: #0e8a63;
        --accent-soft: #d7efe4;
        --danger: #9d3d32;
        --danger-soft: #f7ddd8;
        --warn: #93650d;
        --warn-soft: #f8ebc4;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", sans-serif;
        background: radial-gradient(circle at top left, #eef4df 0, var(--bg) 55%);
        color: var(--ink);
      }
      main {
        max-width: 900px;
        margin: 0 auto;
        padding: 48px 24px 72px;
        display: grid;
        gap: 20px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 14px 40px rgba(16, 34, 27, 0.06);
      }
      .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .value {
        margin-top: 8px;
        font-size: 24px;
        font-weight: 700;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.03em;
      }
      .is-online {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .is-offline {
        background: var(--danger-soft);
        color: var(--danger);
      }
      .is-stale {
        background: var(--warn-soft);
        color: var(--warn);
      }
      form {
        display: grid;
        gap: 14px;
      }
      input, select, button {
        font: inherit;
      }
      input, select {
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
      }
      button {
        border: 0;
        border-radius: 12px;
        padding: 12px 16px;
        background: var(--accent);
        color: white;
        font-weight: 700;
        cursor: pointer;
      }
      .stack {
        display: grid;
        gap: 12px;
      }
      .meta {
        color: var(--muted);
      }
      .error {
        background: var(--danger-soft);
        color: var(--danger);
        border: 1px solid #edc0b7;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <div class="label">SB-00 Provisioning</div>
        <div class="value">QR + Web/PWA flow</div>
        <p class="meta">Single customer-facing provisioning path for MVP and pilot. No BLE or native app branching.</p>
      </section>

      <section class="card">
        <form method="get" action="/provision">
          <label class="stack">
            <span class="label">QR Payload Or Device ID</span>
            <input type="text" name="qr" value="${escapeHtml(qrValue)}" placeholder="sb00-devkit-02 or a QR URL" />
          </label>
          <label class="stack">
            <span class="label">Actor User ID</span>
            <input type="text" name="actor_user_id" value="${escapeHtml(actorUserId)}" />
          </label>
          <button type="submit">Resolve device</button>
        </form>
      </section>

      <section class="card ${error ? "error" : ""}">
        <div class="label">State</div>
        <div class="value">${escapeHtml(provisioningStateLabel(state))}</div>
        ${error ? `<p>${escapeHtml(error)}</p>` : `<p class="meta">Device and farm scope are checked before binding.</p>`}
      </section>

      ${
        device
          ? `
        <section class="card">
          <div class="label">Resolved Device</div>
          <div class="value">${escapeHtml(device.serial_number || device.device_id)}</div>
          <p class="meta">${escapeHtml(device.device_id)} | ${escapeHtml(device.provisioning_state)} | ${escapeHtml(device.farm_name || "Unbound")}</p>
        </section>
      `
          : ""
      }

      ${
        device && resolved?.state === "valid_unbound"
          ? `
        <section class="card">
          <form method="post" action="/provision/bind">
            <input type="hidden" name="device_id" value="${escapeHtml(device.device_id)}" />
            <input type="hidden" name="actor_user_id" value="${escapeHtml(actorUserId)}" />
            <label class="stack">
              <span class="label">Choose Farm</span>
              <select name="farm_id">
                ${farms
                  .map(
                    (farm) => `<option value="${escapeHtml(farm.id)}" ${farm.id === selectedFarmId ? "selected" : ""}>${escapeHtml(farm.name)}</option>`
                  )
                  .join("")}
              </select>
            </label>
            <button type="submit">Bind device</button>
          </form>
        </section>
      `
          : ""
      }

      ${
        bindResult?.ok
          ? `
        <section class="card">
          <div class="label">Bind Result</div>
          <div class="value">Success</div>
          <p class="meta">${escapeHtml(bindResult.result.device.device_id)} is now linked to ${escapeHtml(bindResult.result.farm.name)}.</p>
        </section>
      `
          : ""
      }
    </main>
  </body>
</html>`;
}

function renderPage({ devices, selectedDevice, history, alerts, deviceAlerts, error }) {
  const deviceCards = devices.length
    ? devices
        .map(
          (device) => `
            <a class="device-row" href="/devices/${encodeURIComponent(device.device_id)}">
              <div>
                <div class="device-title">${escapeHtml(device.serial_number || device.device_id)}</div>
                <div class="device-subtitle">${escapeHtml(device.device_id)}</div>
              </div>
              <div class="device-meta">
                <span class="pill ${onlineClass(device.online_state)}">${onlineLabel(device.online_state)}</span>
                <span>${formatMetric(device.temperature_c, " C")}</span>
                <span>${formatMetric(device.battery_percent, "%")}</span>
                <span>${formatDate(device.last_seen_at)}</span>
              </div>
            </a>
          `
        )
        .join("")
    : `<div class="empty-card">No devices found yet. Ingest one payload first.</div>`;

  const detail = selectedDevice
    ? `
      <section class="detail-shell">
        <div class="detail-header">
          <div>
            <div class="label">Device Detail</div>
            <h2>${escapeHtml(selectedDevice.serial_number || selectedDevice.device_id)}</h2>
            <p>${escapeHtml(selectedDevice.device_id)} | ${labelBatteryVariant(selectedDevice.battery_variant)} | Firmware ${escapeHtml(selectedDevice.firmware_version || "N/A")}</p>
          </div>
          <span class="pill ${onlineClass(selectedDevice.online_state)}">${onlineLabel(selectedDevice.online_state)}</span>
        </div>
        <section class="metrics-grid">
          <article class="card">
            <div class="label">Temperature</div>
            <div class="value">${formatMetric(selectedDevice.temperature_c, " C")}</div>
          </article>
          <article class="card">
            <div class="label">Turbidity</div>
            <div class="value">${formatMetric(selectedDevice.turbidity_raw)}</div>
          </article>
          <article class="card">
            <div class="label">Battery</div>
            <div class="value">${formatMetric(selectedDevice.battery_percent, "%")}</div>
            <p>${formatMetric(selectedDevice.battery_mv, " mV")} | ${labelBatteryVariant(selectedDevice.battery_variant)}</p>
          </article>
          <article class="card">
            <div class="label">Last Seen</div>
            <div class="value">${formatDate(selectedDevice.last_seen_at)}</div>
            <p>GPS fix: ${escapeHtml(selectedDevice.gps_fix_state || "none")}</p>
          </article>
        </section>
        <section class="detail-grid">
          <article class="card">
            <div class="label">Location</div>
            ${renderMap(selectedDevice)}
          </article>
          <article class="card">
            <div class="label">Recent Temperature</div>
            ${renderChart(history)}
          </article>
        </section>
      </section>
    `
    : `
      <section class="detail-shell">
        <div class="empty-card">Select a device to view latest values, map, and history.</div>
      </section>
    `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SB-00 Dashboard MVP</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f6ef;
        --panel: #ffffff;
        --ink: #10221b;
        --muted: #53645c;
        --line: #d7ddd3;
        --accent: #0e8a63;
        --accent-soft: #d7efe4;
        --danger: #9d3d32;
        --danger-soft: #f7ddd8;
        --warn: #93650d;
        --warn-soft: #f8ebc4;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", sans-serif;
        background: radial-gradient(circle at top left, #eef4df 0, var(--bg) 55%);
        color: var(--ink);
      }
      main {
        max-width: 1220px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      .hero {
        display: grid;
        gap: 16px;
        margin-bottom: 28px;
      }
      .layout {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 14px 40px rgba(16, 34, 27, 0.06);
      }
      .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .value {
        margin-top: 8px;
        font-size: 22px;
        font-weight: 700;
      }
      .sidebar {
        display: grid;
        gap: 16px;
        align-content: start;
      }
      .device-list {
        display: grid;
        gap: 12px;
      }
      .device-row {
        display: grid;
        gap: 10px;
        padding: 16px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        color: inherit;
      }
      .device-row:hover {
        border-color: #9acbb7;
        box-shadow: 0 14px 32px rgba(16, 34, 27, 0.08);
      }
      .device-title {
        font-size: 18px;
        font-weight: 700;
      }
      .device-subtitle,
      .device-meta {
        color: var(--muted);
        font-size: 13px;
      }
      .device-meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.03em;
      }
      .is-online {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .is-offline {
        background: var(--danger-soft);
        color: var(--danger);
      }
      .is-stale {
        background: var(--warn-soft);
        color: var(--warn);
      }
      .detail-shell {
        display: grid;
        gap: 16px;
        align-content: start;
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: start;
      }
      .detail-header h2 {
        margin: 6px 0 8px;
      }
      .metrics-grid,
      .detail-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      }
      .detail-grid .card:first-child {
        min-height: 360px;
      }
      .map-shell {
        display: grid;
        gap: 12px;
      }
      .map-frame {
        width: 100%;
        min-height: 280px;
        border: 0;
        border-radius: 16px;
        background: #eaf0e8;
      }
      .map-meta {
        margin: 0;
        color: var(--muted);
      }
      .chart {
        width: 100%;
        height: auto;
        display: block;
      }
      .empty-card {
        background: linear-gradient(180deg, #fbfdf8 0%, #f2f6ee 100%);
        border: 1px dashed #c6d1c3;
        border-radius: 18px;
        padding: 22px;
        color: var(--muted);
      }
      .error-banner {
        padding: 14px 16px;
        border-radius: 14px;
        background: var(--danger-soft);
        color: var(--danger);
        border: 1px solid #edc0b7;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
      @media (max-width: 980px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="label">SB-00 Dashboard</div>
        <h1>Operational dashboard MVP</h1>
        <p>Device list, latest status, map, and recent telemetry now render from the real <code>devices</code>, <code>device_status</code>, and <code>telemetry</code> query paths.</p>
        <p>Backend API: <a href="${config.backendUrl}/health">${config.backendUrl}/health</a></p>
      </section>
      ${error ? `<section class="error-banner">${escapeHtml(error)}</section>` : ""}
      <section class="layout">
        <aside class="sidebar">
          <article class="card">
            <div class="label">Device Fleet</div>
            <div class="value">${devices.length}</div>
            <p>Map provider: ${escapeHtml(config.mapProvider)} | Provisioning: QR + Web/PWA</p>
          </article>
          <article class="card">
            <div class="label">Open Alerts</div>
            <div class="value">${alerts.length}</div>
            <div class="device-list">${renderAlerts(alerts)}</div>
          </article>
          <div class="device-list">${deviceCards}</div>
        </aside>
        ${detail}
      ${selectedDevice ? `
        <section class="card">
          <div class="label">Device Alerts</div>
          <div class="device-list">${renderAlerts(deviceAlerts)}</div>
        </section>
      ` : ""}
      </section>
    </main>
  </body>
</html>`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.code ?? "request_failed");
  }

  return data;
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end("missing_url");
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? `localhost:${config.port}`}`);

  if (request.method === "GET" && url.pathname === "/provision") {
    const qrValue = url.searchParams.get("qr") ?? url.searchParams.get("device_id") ?? "";
    const actorUserId = url.searchParams.get("actor_user_id") ?? DEV_ACTOR_USER_ID;
    let resolved = null;
    let error = "";

    if (qrValue) {
      try {
        const provisioning = await fetchJson(
          `${config.backendUrl}/api/provisioning/resolve?qr=${encodeURIComponent(qrValue)}&actor_user_id=${encodeURIComponent(actorUserId)}`
        );
        resolved = provisioning.result ?? null;
      } catch (caughtError) {
        error = caughtError instanceof Error ? caughtError.message : "provisioning_resolve_failed";
      }
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderProvisioningPage({ qrValue, actorUserId, resolved, bindResult: null, error }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/provision/bind") {
    let bindResult = null;
    let resolved = null;
    let error = "";
    const form = await readFormBody(request);
    const qrValue = form.qr || form.device_id || "";
    const actorUserId = form.actor_user_id || DEV_ACTOR_USER_ID;

    try {
      bindResult = await fetchJson(`${config.backendUrl}/api/provisioning/bind`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          qr: form.qr || null,
          device_id: form.device_id || null,
          farm_id: form.farm_id || null,
          actor_user_id: actorUserId
        })
      });

      const provisioning = await fetchJson(
        `${config.backendUrl}/api/provisioning/resolve?device_id=${encodeURIComponent(form.device_id || "")}&actor_user_id=${encodeURIComponent(actorUserId)}`
      );
      resolved = provisioning.result ?? null;
    } catch (caughtError) {
      error = caughtError instanceof Error ? caughtError.message : "provisioning_bind_failed";
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderProvisioningPage({ qrValue, actorUserId, resolved, bindResult, error }));
    return;
  }

  if (url.pathname === "/" || url.pathname === "/devices" || url.pathname.startsWith("/devices/")) {
    let devices = [];
    let selectedDevice = null;
    let history = [];
    let alerts = [];
    let deviceAlerts = [];
    let error = "";
    const selectedDeviceId = url.pathname.startsWith("/devices/")
      ? decodeURIComponent(url.pathname.split("/")[2] ?? "")
      : "";

    try {
      const devicesResult = await fetchJson(`${config.backendUrl}/api/devices`);
      const alertsResult = await fetchJson(`${config.backendUrl}/api/alerts?status=open`);
      devices = devicesResult.devices ?? [];
      alerts = alertsResult.alerts ?? [];

      const fallbackDeviceId = selectedDeviceId || devices[0]?.device_id || "";
      if (fallbackDeviceId) {
        const [deviceResult, historyResult, deviceAlertsResult] = await Promise.all([
          fetchJson(`${config.backendUrl}/api/devices/${encodeURIComponent(fallbackDeviceId)}`),
          fetchJson(`${config.backendUrl}/api/devices/${encodeURIComponent(fallbackDeviceId)}/history?hours=24`),
          fetchJson(`${config.backendUrl}/api/devices/${encodeURIComponent(fallbackDeviceId)}/alerts?status=all`)
        ]);
        selectedDevice = deviceResult.device ?? null;
        history = historyResult.history ?? [];
        deviceAlerts = deviceAlertsResult.alerts ?? [];
      }
    } catch (caughtError) {
      error = caughtError instanceof Error ? caughtError.message : "dashboard_data_unavailable";
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderPage({ devices, selectedDevice, history, alerts, deviceAlerts, error }));
    return;
  }

  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ service: "dashboard", ok: true, port: config.port }, null, 2));
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("not_found");
});

server.listen(config.port, () => {
  console.log(`[dashboard] listening on http://localhost:${config.port}`);
});
