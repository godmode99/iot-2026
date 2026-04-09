import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadCustomerDashboard } from "@/lib/data/customer-dashboard.js";

export const dynamic = "force-dynamic";

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function alertSourceLabel(value, messages) {
  if (value === "record") {
    return t(messages, "dashboard.alertSources.record", "Record-driven");
  }

  if (value === "telemetry") {
    return t(messages, "dashboard.alertSources.telemetry", "Telemetry-driven");
  }

  if (value === "expectation") {
    return t(messages, "dashboard.alertSources.expectation", "Expectation-driven");
  }

  return t(messages, "dashboard.alertSources.system", "System");
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

function countDevicesByState(devices, state) {
  return devices.filter((device) => firstStatus(device)?.online_state === state).length;
}

function latestSeenAt(devices) {
  const timestamps = devices
    .map((device) => firstStatus(device)?.last_seen_at)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

export default async function DashboardPage() {
  const messages = await getMessages();
  const { authConfigured, user } = await requireUser({ returnUrl: "/dashboard" });
  const dashboard = user ? await loadCustomerDashboard() : null;
  const farmCount = dashboard?.farms.length ?? 0;
  const deviceCount = dashboard?.devices.length ?? 0;
  const openAlertCount = dashboard?.openAlerts.length ?? 0;
  const onlineCount = countDevicesByState(dashboard?.devices ?? [], "online");
  const offlineCount = countDevicesByState(dashboard?.devices ?? [], "offline");
  const staleCount = countDevicesByState(dashboard?.devices ?? [], "stale");
  const criticalAlertCount = (dashboard?.openAlerts ?? []).filter((alert) => alert.severity === "critical").length;
  const lastHeartbeatAt = latestSeenAt(dashboard?.devices ?? []);
  const hasWorkspace = farmCount > 0 || deviceCount > 0;
  const expectationSummary = dashboard?.expectationSummary ?? {
    farmsNeedingAttention: [],
    healthyCount: 0,
    attentionCount: 0,
    recoveredCount: 0
  };
  const expectationTrends = dashboard?.expectationTrends ?? {
    byFarm: [],
    byTemplate: []
  };

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

        <div className="dashboard-health-strip" aria-label={t(messages, "dashboard.fleetHealth")}>
          <span className="health-chip is-online">{onlineCount} {t(messages, "dashboard.onlineDevices")}</span>
          <span className="health-chip is-stale">{staleCount} {t(messages, "dashboard.staleDevices")}</span>
          <span className="health-chip is-offline">{offlineCount} {t(messages, "dashboard.offlineDevices")}</span>
          <span className={`health-chip ${criticalAlertCount ? "is-offline" : "is-online"}`}>
            {criticalAlertCount ? `${criticalAlertCount} ${t(messages, "dashboard.criticalAlerts")}` : t(messages, "dashboard.allClear")}
          </span>
          <span className="health-chip">{t(messages, "dashboard.latestHeartbeat")}: {formatDate(lastHeartbeatAt)}</span>
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
        <Link className="action-card" href="/alerts">
          <span className="eyebrow">{t(messages, "alertsPage.eyebrow", "Open alerts")}</span>
          <strong>{t(messages, "alertsPage.title", "Monitor active alerts across customer farms")}</strong>
          <span className="muted">{t(messages, "alertsPage.body", "Use this list to review open alert load, severity, and which farms or devices need attention first.")}</span>
        </Link>
        <Link className="action-card" href="/records">
          <span className="eyebrow">{t(messages, "recordsPage.eyebrow", "Operational records")}</span>
          <strong>{t(messages, "recordsPage.newRecordTitle", "Create structured records")}</strong>
          <span className="muted">{t(messages, "recordsPage.newRecordBody", "Capture daily work in a structured operating record.")}</span>
        </Link>
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

      {!hasWorkspace ? (
        <section className="empty-panel dashboard-card">
          <div>
            <p className="eyebrow">{t(messages, "dashboard.emptyEyebrow")}</p>
            <h2>{t(messages, "dashboard.emptyTitle")}</h2>
            <p className="muted">{t(messages, "dashboard.emptyBody")}</p>
          </div>
          <div className="action-row">
            <Link className="button" href="/farms/new">{t(messages, "dashboard.emptyCtaFarm")}</Link>
            <Link className="button-secondary" href="/provision">{t(messages, "dashboard.emptyCtaProvision")}</Link>
          </div>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <div className="card">
          <div className="split-heading">
            <h2>{t(messages, "dashboard.alertBreakdownTitle", "Alert breakdown")}</h2>
            <Link className="button-secondary" href="/alerts">{t(messages, "alertsPage.viewAllAction", "View all alerts")}</Link>
          </div>
        <div className="records-field-group-grid">
          <article className="records-field-group-card">
            <h3>{t(messages, "dashboard.alertSources.record", "Record-driven")}</h3>
              <p>{dashboard?.alertMetrics.bySource.record ?? 0}</p>
            </article>
          <article className="records-field-group-card">
            <h3>{t(messages, "dashboard.alertSources.telemetry", "Telemetry-driven")}</h3>
            <p>{dashboard?.alertMetrics.bySource.telemetry ?? 0}</p>
          </article>
          <article className="records-field-group-card">
            <h3>{t(messages, "dashboard.alertSources.expectation", "Expectation-driven")}</h3>
            <p>{dashboard?.alertMetrics.bySource.expectation ?? 0}</p>
          </article>
          <article className="records-field-group-card">
            <h3>{t(messages, "dashboard.alertSources.system", "System")}</h3>
            <p>{dashboard?.alertMetrics.bySource.system ?? 0}</p>
            </article>
          </div>
          <div className="record-meta-list">
            {dashboard?.alertMetrics.topTypes.length ? (
              dashboard.alertMetrics.topTypes.map((item) => (
                <span key={item.alertType}>
                  {label(item.alertType)}: {item.count}
                </span>
              ))
            ) : (
              <span>{t(messages, "dashboard.alertBreakdownEmpty", "No active alert types to summarize yet.")}</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="split-heading">
            <h2>{t(messages, "dashboard.expectationsTitle", "Record expectations")}</h2>
            <Link className="button-secondary" href="/records">{t(messages, "dashboard.viewAllRecords", "View all records")}</Link>
          </div>
          <div className="records-field-group-grid">
            <article className="records-field-group-card">
              <h3>{t(messages, "dashboard.expectationsHealthy", "Current")}</h3>
              <p>{expectationSummary.healthyCount}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "dashboard.expectationsAttention", "Needs attention")}</h3>
              <p>{expectationSummary.attentionCount}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "dashboard.expectationsRecovered", "Recovered this week")}</h3>
              <p>{expectationSummary.recoveredCount}</p>
            </article>
          </div>
          {expectationSummary.farmsNeedingAttention.length ? (
            <ul className="status-list">
              {expectationSummary.farmsNeedingAttention.map((farm) => (
                <li className="mobile-list-row" key={farm.farmId}>
                  <span>
                    <Link href={`/farms/${farm.farmId}`}>{farm.farmName}</Link>
                    <span className="list-meta">
                      {farm.attentionCount} {t(messages, "dashboard.expectationsAttentionTemplates", "templates need attention")}
                    </span>
                    <span className="list-meta">
                      {farm.expectations
                        .filter((item) => item.status === "attention")
                        .map((item) => item.templateName)
                        .join(", ")}
                    </span>
                  </span>
                  <span className="pill">{t(messages, "dashboard.expectationsAttention", "Needs attention")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "dashboard.expectationsEmpty", "All visible farm templates have a recent record in the last 7 days.")}</p>
          )}
        </div>

        <div className="card">
          <div className="split-heading">
            <h2>{t(messages, "dashboard.expectationTrendsTitle", "Expectation trends")}</h2>
            <span className="pill">{t(messages, "dashboard.expectationTrendsWindow", "Last 30 days")}</span>
          </div>
          <div className="records-field-group-grid">
            <article className="records-field-group-card">
              <h3>{t(messages, "dashboard.expectationTrendsByFarm", "Most affected farms")}</h3>
              {expectationTrends.byFarm.length ? (
                <ul className="status-list">
                  {expectationTrends.byFarm.map((item) => (
                    <li className="mobile-list-row" key={item.farmId}>
                      <span>
                        <Link href={`/farms/${item.farmId}`}>{item.farmName}</Link>
                      </span>
                      <span className="pill">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t(messages, "dashboard.expectationTrendsEmpty", "No missing-record trend data yet.")}</p>
              )}
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "dashboard.expectationTrendsByTemplate", "Most missed templates")}</h3>
              {expectationTrends.byTemplate.length ? (
                <ul className="status-list">
                  {expectationTrends.byTemplate.map((item) => (
                    <li className="mobile-list-row" key={item.templateCode}>
                      <span>
                        <strong>{item.templateName}</strong>
                        <span className="list-meta">{item.templateCode}</span>
                      </span>
                      <span className="pill">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t(messages, "dashboard.expectationTrendsEmpty", "No missing-record trend data yet.")}</p>
              )}
            </article>
          </div>
        </div>

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
          <div className="split-heading">
            <h2>{t(messages, "dashboard.recentRecords", "Recent records")}</h2>
            <Link className="button-secondary" href="/records">{t(messages, "dashboard.viewAllRecords", "View all records")}</Link>
          </div>
          {dashboard?.recentRecords.length ? (
            <ul className="status-list">
              {dashboard.recentRecords.map((record) => {
                const template = firstRelated(record.record_templates);
                const farm = firstRelated(record.farms);

                return (
                  <li className="mobile-list-row" key={record.id}>
                    <span>
                      <Link href={`/records/${record.id}`}>{template?.name ?? "Operational record"}</Link>
                      <span className="list-meta">{farm?.name ?? "Farm"} · {formatDate(record.recorded_for_date ?? record.created_at)}</span>
                      {record.notes_summary ? <span className="list-meta">{record.notes_summary}</span> : null}
                    </span>
                    <span className="pill">{record.record_status ?? "submitted"}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">{t(messages, "dashboard.noRecords", "No records are visible for this account yet.")}</p>
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
          <div className="split-heading">
            <h2>{t(messages, "dashboard.openAlerts")}</h2>
            <Link className="button-secondary" href="/alerts">{t(messages, "alertsPage.viewAllAction", "View all alerts")}</Link>
          </div>
          <ul className="status-list">
            {dashboard.openAlerts.map((alert) => {
              const device = firstRelated(alert.devices);
              const deviceLabel = device?.serial_number ?? device?.device_id ?? alert.device_id;

              return (
                <li className="mobile-list-row" key={alert.id}>
                  <span>
                    <Link href={`/alerts/${alert.id}`}>{label(alert.alert_type)}</Link>
                    <span className="list-meta">{deviceLabel}</span>
                    <span className="list-meta">
                      {alertSourceLabel(
                        alert.source === "record_detail"
                          ? "record"
                          : alert.source === "device_telemetry"
                            ? "telemetry"
                            : alert.source === "record_expectation"
                              ? "expectation"
                              : "system",
                        messages
                      )}
                    </span>
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
