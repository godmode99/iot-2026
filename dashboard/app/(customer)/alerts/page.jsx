import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadCustomerAlerts } from "@/lib/data/customer-alerts.js";
import { getMessages, t } from "@/lib/i18n.js";

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
  if (value === "critical") {
    return "is-offline";
  }

  if (value === "warning") {
    return "is-stale";
  }

  return "is-online";
}

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

export default async function AlertsPage({ searchParams }) {
  const messages = await getMessages();
  const query = await searchParams;
  const farmId = typeof query?.farm === "string" ? query.farm : "";
  const severity = typeof query?.severity === "string" ? query.severity : "";
  const search = typeof query?.q === "string" ? query.q : "";

  await requireUser({ returnUrl: "/alerts" });
  const overview = await loadCustomerAlerts({
    farmId,
    severity,
    search
  });
  const hasFilters = Boolean(overview.filters.farmId || overview.filters.severity || overview.filters.search);

  return (
    <AppShell currentPath="/alerts" ariaLabel="Alerts navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "alertsPage.eyebrow", "Open alerts")}</p>
          <h1 className="page-title">{t(messages, "alertsPage.title", "Monitor active alerts across customer farms")}</h1>
          <p className="lede">{t(messages, "alertsPage.body", "Use this list to review open alert load, severity, and which farms or devices need attention first.")}</p>
        </div>
        <div className="metric-grid dashboard-metrics">
          <div className="metric metric-emphasis">
            <span className="metric-value">{overview.metrics.total}</span>
            <span className="muted">{t(messages, "alertsPage.metrics.total", "Open alerts")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{overview.metrics.critical}</span>
            <span className="muted">{t(messages, "alertsPage.metrics.critical", "Critical")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{overview.metrics.warning}</span>
            <span className="muted">{t(messages, "alertsPage.metrics.warning", "Warning")}</span>
          </div>
        </div>
      </section>

      {overview.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "alertsPage.dataWarnings", "Alert data warnings")}</strong>
          <ul>
            {overview.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-card">
        <div className="split-heading">
          <div>
            <p className="eyebrow">{t(messages, "alertsPage.filterEyebrow", "Filter alerts")}</p>
            <h2>{t(messages, "alertsPage.filterTitle", "Find the alert that needs action")}</h2>
          </div>
          {hasFilters ? <Link className="button-secondary" href="/alerts">{t(messages, "alertsPage.clearFiltersAction", "Clear filters")}</Link> : null}
        </div>
        <form className="records-filter-form" method="get">
          <label>
            {t(messages, "alertsPage.filters.search", "Search")}
            <input
              defaultValue={overview.filters.search}
              name="q"
              placeholder={t(messages, "alertsPage.filters.searchPlaceholder", "Search by alert type, farm, or device")}
              type="search"
            />
          </label>
          <label>
            {t(messages, "alertsPage.filters.farm", "Farm")}
            <select defaultValue={overview.filters.farmId} name="farm">
              <option value="">{t(messages, "alertsPage.filters.allFarms", "All farms")}</option>
              {overview.farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </label>
          <label>
            {t(messages, "alertsPage.filters.severity", "Severity")}
            <select defaultValue={overview.filters.severity} name="severity">
              <option value="">{t(messages, "alertsPage.filters.allSeverities", "All severities")}</option>
              <option value="critical">{t(messages, "alertsPage.filters.critical", "Critical")}</option>
              <option value="warning">{t(messages, "alertsPage.filters.warning", "Warning")}</option>
              <option value="info">{t(messages, "alertsPage.filters.info", "Info")}</option>
            </select>
          </label>
          <div className="records-filter-actions">
            <button className="button" type="submit">{t(messages, "alertsPage.applyFiltersAction", "Apply filters")}</button>
          </div>
        </form>
      </section>

      <section className="card dashboard-card">
        <div className="split-heading">
          <div>
            <p className="eyebrow">{t(messages, "alertsPage.listEyebrow", "Open alert list")}</p>
            <h2>{t(messages, "alertsPage.listTitle", "Current open alerts")}</h2>
          </div>
          <span className="pill">{overview.alerts.length} {t(messages, "alertsPage.filteredCount", "alerts")}</span>
        </div>
        {overview.alerts.length ? (
          <ul className="status-list">
            {overview.alerts.map((alert) => (
              <li className="mobile-list-row" key={alert.id}>
                <span>
                  <Link href={`/alerts/${alert.id}`}>{label(alert.alert_type)}</Link>
                  <span className="list-meta">
                    {alert.farms?.name ?? "Farm"} · {alert.devices?.serial_number ?? alert.devices?.device_id ?? alert.device_id ?? "Unknown device"}
                  </span>
                  <span className="list-meta">{formatDate(alert.opened_at)}</span>
                </span>
                <span className="pill-row">
                  <span className={`pill ${statusClass(alert.severity)}`}>{alert.severity}</span>
                  {alert.devices?.device_id ? <Link className="button-secondary" href={`/devices/${alert.devices.device_id}`}>{t(messages, "alertsPage.viewDeviceAction", "View device")}</Link> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-panel">
            <div>
              <p className="eyebrow">{t(messages, "alertsPage.emptyEyebrow", "No open alerts")}</p>
              <h2>{t(messages, "alertsPage.emptyTitle", "Alert queue is currently clear")}</h2>
              <p className="muted">{t(messages, "alertsPage.emptyBody", "Keep this page as the central place for active alert review once more monitoring and automation layers come online.")}</p>
            </div>
            <div className="action-row">
              <Link className="button-secondary" href="/dashboard">{t(messages, "alertsPage.backDashboardAction", "Back to dashboard")}</Link>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
