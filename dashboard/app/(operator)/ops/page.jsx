import Link from "next/link";
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

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Ops navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/dashboard">{t(messages, "nav.dashboard")}</Link>
          <Link className="nav-link" href="/provision">{t(messages, "nav.provision")}</Link>
        </div>
      </nav>

      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}

      <section className="card dashboard-card">
        <p className="eyebrow">{t(messages, "ops.eyebrow")}</p>
        <h1 className="page-title">{t(messages, "ops.title")}</h1>
        <p className="lede">{ops?.authorized ? t(messages, "ops.body") : t(messages, "ops.notAuthorized")}</p>
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
          <section className="metric-grid dashboard-metrics">
            <Metric labelText={t(messages, "ops.farms")} value={ops.metrics.farmCount} />
            <Metric labelText={t(messages, "ops.devices")} value={ops.metrics.deviceCount} />
            <Metric labelText={t(messages, "ops.online")} value={ops.metrics.onlineCount} />
            <Metric labelText={t(messages, "ops.attention")} value={ops.metrics.attentionCount} meta={`${ops.metrics.criticalAlertCount} critical`} />
          </section>

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
    </main>
  );
}
