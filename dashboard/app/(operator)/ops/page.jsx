import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOpsOverview } from "@/lib/data/ops-overview.js";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function statusClass(value) {
  if (value === "online" || value === "succeeded" || value === "resolved") {
    return "is-online";
  }
  if (value === "offline" || value === "failed" || value === "critical") {
    return "is-offline";
  }
  return "is-stale";
}

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function countDevicesByState(devices, state) {
  return devices.filter((device) => device.status?.online_state === state).length;
}

function latestSeenAt(devices) {
  const timestamps = devices
    .map((device) => device.status?.last_seen_at)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function Metric({ labelText, value, meta }) {
  return (
    <article className="metric">
      <span className="muted">{labelText}</span>
      <span className="metric-value">{value}</span>
      {meta ? <span className="muted">{meta}</span> : null}
    </article>
  );
}

export default async function OpsPage() {
  const messages = await getMessages();
  const { authConfigured, user } = await requireUser({ returnUrl: "/ops" });
  const ops = user ? await loadOpsOverview() : null;
  const offlineCount = countDevicesByState(ops?.devices ?? [], "offline");
  const staleCount = countDevicesByState(ops?.devices ?? [], "stale");
  const latestHeartbeatAt = latestSeenAt(ops?.devices ?? []);
  const missingContactCount = (ops?.farms ?? []).filter((farm) => !farm.alert_email_to && !farm.alert_line_user_id).length;

  return (
    <AppShell currentPath="/ops" ariaLabel="Ops navigation">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}

      <section className="ops-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "ops.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "ops.title")}</h1>
          <p className="lede">{ops?.authorized ? t(messages, "ops.body") : t(messages, "ops.notAuthorized")}</p>
        </div>

        {ops?.authorized ? (
          <div className="ops-hero-panel">
            <div className="metric-grid compact-grid">
              <Metric labelText={t(messages, "ops.farms")} value={ops.metrics.farmCount} />
              <Metric labelText={t(messages, "ops.devices")} value={ops.metrics.deviceCount} />
              <Metric labelText={t(messages, "ops.attention")} value={ops.metrics.attentionCount} meta={`${ops.metrics.criticalAlertCount} ${t(messages, "ops.critical")}`} />
            </div>
            <div className="ops-health-strip">
              <span className="health-chip is-online">{ops.metrics.onlineCount} {t(messages, "ops.online")}</span>
              <span className="health-chip is-stale">{staleCount} {t(messages, "ops.stale")}</span>
              <span className="health-chip is-offline">{offlineCount} {t(messages, "ops.offline")}</span>
              <span className={`health-chip ${missingContactCount ? "is-stale" : "is-online"}`}>
                {missingContactCount ? `${missingContactCount} ${t(messages, "ops.missingContacts")}` : t(messages, "ops.contactsReady")}
              </span>
              <span className="health-chip">{t(messages, "ops.latestHeartbeat")}: {formatDate(latestHeartbeatAt)}</span>
            </div>
          </div>
        ) : null}
      </section>

      {ops?.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {ops.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      {ops?.authorized ? (
        <>
          <section className="dashboard-grid">
            <article className="card">
              <h2>{t(messages, "ops.fleetSnapshot")}</h2>
              {ops.devices.length ? (
                <ul className="status-list">
                  {ops.devices.slice(0, 16).map((device) => (
                    <li key={device.id}>
                      <span>
                        <Link href={`/devices/${device.device_id}`}>{device.serial_number ?? device.device_id}</Link>
                        <span className="muted"> {device.farms?.name ?? ""}</span>
                      </span>
                      <span className={`pill ${statusClass(device.status?.online_state)}`}>{label(device.status?.online_state)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "ops.noDevices")}</p>}
            </article>

            <article className="card">
              <h2>{t(messages, "ops.openAlerts")}</h2>
              {ops.openAlerts.length ? (
                <ul className="status-list">
                  {ops.openAlerts.map((alert) => (
                    <li key={alert.id}>
                      <span>
                        {label(alert.alert_type)}
                        <span className="muted"> {alert.devices?.serial_number ?? alert.devices?.device_id ?? ""}</span>
                      </span>
                      <span className={`pill ${statusClass(alert.severity)}`}>{alert.severity}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "ops.noAlerts")}</p>}
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="card">
              <h2>{t(messages, "ops.recentCommands")}</h2>
              {ops.recentCommands.length ? (
                <ul className="status-list">
                  {ops.recentCommands.map((command) => (
                    <li key={command.id}>
                      <span>
                        {label(command.command_type)}
                        <span className="muted"> {command.devices?.serial_number ?? command.devices?.device_id ?? ""}</span>
                      </span>
                      <span className={`pill ${statusClass(command.status)}`}>{command.status}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "ops.noCommands")}</p>}
            </article>

            <article className="card">
              <h2>{t(messages, "ops.notificationContacts")}</h2>
              {ops.farms.length ? (
                <ul className="status-list">
                  {ops.farms.slice(0, 16).map((farm) => (
                    <li key={farm.id} className="stacked-row">
                      <div>
                        <Link href={`/farms/${farm.id}`}>{farm.name}</Link>
                        <span className="muted">{formatDate(farm.updated_at)}</span>
                      </div>
                      <div className="pill-row">
                        <span className="pill">{farm.alert_email_to || "no email"}</span>
                        <span className="pill">{farm.alert_line_user_id || "no LINE"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "ops.noFarms")}</p>}
            </article>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
