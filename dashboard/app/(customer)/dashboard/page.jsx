import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadCustomerDashboard } from "@/lib/data/customer-dashboard.js";

export const dynamic = "force-dynamic";

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

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
  if (value === "online" || value === "resolved") {
    return "is-online";
  }
  if (value === "offline" || value === "critical") {
    return "is-offline";
  }
  return "is-stale";
}

function firstStatus(device) {
  if (Array.isArray(device.device_status)) {
    return device.device_status[0] ?? null;
  }

  return device.device_status ?? null;
}

function firstRelated(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function batteryLabel(status) {
  if (!status?.battery_percent && status?.battery_percent !== 0) {
    return "battery N/A";
  }

  return `${Number(status.battery_percent).toFixed(0)}% battery`;
}

export default async function DashboardPage() {
  const messages = await getMessages();
  const { authConfigured, user } = await requireUser({ returnUrl: "/dashboard" });
  const dashboard = user ? await loadCustomerDashboard() : null;
  const farmCount = dashboard?.farms.length ?? 0;
  const deviceCount = dashboard?.devices.length ?? 0;
  const openAlertCount = dashboard?.openAlerts.length ?? 0;

  return (
    <AppShell currentPath="/dashboard" ariaLabel="Dashboard navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "dashboard.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "dashboard.title")}</h1>
          {!authConfigured ? (
            <p className="notice">{t(messages, "dashboard.authPending")}</p>
          ) : (
            <p className="pill">{t(messages, "dashboard.signedInAs")}: {user.email}</p>
          )}
        </div>

        <div className="metric-grid dashboard-metrics">
          <div className="metric metric-emphasis">
            <span className="metric-value">{deviceCount}</span>
            <span className="muted">{t(messages, "dashboard.devices")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{farmCount}</span>
            <span className="muted">{t(messages, "dashboard.farms")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{openAlertCount}</span>
            <span className="muted">{t(messages, "dashboard.openAlerts")}</span>
          </div>
        </div>
      </section>

      {dashboard?.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {dashboard.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-actions-grid dashboard-card" aria-label="Quick actions">
        <Link className="action-card" href="/provision">
          <span className="eyebrow">{t(messages, "nav.provision")}</span>
          <strong>{t(messages, "placeholder.provisionTitle")}</strong>
          <span className="muted">{t(messages, "provision.stateBody")}</span>
        </Link>
        <Link className="action-card" href="/farms/new">
          <span className="eyebrow">{t(messages, "farmCreate.eyebrow")}</span>
          <strong>{t(messages, "farmCreate.createAction")}</strong>
          <span className="muted">{t(messages, "farmCreate.body")}</span>
        </Link>
      </section>

      <section className="dashboard-grid">
        <div className="card">
          <h2>{t(messages, "dashboard.recentFarms")}</h2>
          {dashboard?.farms.length ? (
            <ul className="status-list">
              {dashboard.farms.map((farm) => (
                <li className="mobile-list-row" key={farm.id}>
                  <span>
                    <Link href={`/farms/${farm.id}`}>{farm.name}</Link>
                    <span className="list-meta">{formatDate(farm.created_at)}</span>
                  </span>
                  <span className="pill">farm</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "dashboard.noFarms")}</p>
          )}
        </div>

        <div className="card">
          <h2>{t(messages, "dashboard.visibleDevices")}</h2>
          {dashboard?.devices.length ? (
            <ul className="status-list">
              {dashboard.devices.map((device) => {
                const status = firstStatus(device);

                return (
                  <li className="mobile-list-row" key={device.id}>
                    <span>
                      <Link href={`/devices/${device.device_id}`}>{device.serial_number ?? device.device_id}</Link>
                      <span className="list-meta">{formatDate(status?.last_seen_at)}</span>
                    </span>
                    <span className="pill-row">
                      <span className={`pill ${statusClass(status?.online_state)}`}>{label(status?.online_state)}</span>
                      <span className="pill">{batteryLabel(status)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">{t(messages, "dashboard.noDevices")}</p>
          )}
        </div>
      </section>

      {dashboard?.openAlerts.length ? (
        <section className="card dashboard-card">
          <h2>{t(messages, "dashboard.openAlerts")}</h2>
          <ul className="status-list">
            {dashboard.openAlerts.map((alert) => {
              const device = firstRelated(alert.devices);
              const deviceLabel = device?.serial_number ?? device?.device_id ?? alert.device_id;

              return (
                <li className="mobile-list-row" key={alert.id}>
                  <span>
                    <Link href={`/devices/${device?.device_id ?? alert.device_id}`}>{label(alert.alert_type)}</Link>
                    <span className="list-meta">{deviceLabel}</span>
                  </span>
                  <span className={`pill ${statusClass(alert.severity)}`}>{alert.severity}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
