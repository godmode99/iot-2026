import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOpsOverview } from "@/lib/data/ops-overview.js";

export const dynamic = "force-dynamic";

function handoffFreshness(value, messages) {
  if (!value) {
    return {
      className: "is-stale",
      label: t(messages, "ops.noHandoffYet", "No handoff yet")
    };
  }

  const ageMs = Date.now() - new Date(value).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays <= 1) {
    return {
      className: "is-online",
      label: t(messages, "ops.handoffFresh", "Fresh")
    };
  }

  if (ageDays <= 3) {
    return {
      className: "is-stale",
      label: t(messages, "ops.handoffRecent", "Recent")
    };
  }

  return {
    className: "is-offline",
    label: t(messages, "ops.handoffStale", "Stale")
  };
}

function buildReportUrl({ windowValue, severity, source }) {
  const params = new URLSearchParams();
  params.set("window", windowValue);
  if (severity && severity !== "all") {
    params.set("severity", severity);
  }
  if (source && source !== "all") {
    params.set("source", source);
  }

  return `/ops/reports?${params.toString()}`;
}

function exportLink(report, windowValue, severity, source) {
  const params = new URLSearchParams();
  params.set("report", report);
  params.set("window", windowValue);
  if (severity && severity !== "all") {
    params.set("severity", severity);
  }
  if (source && source !== "all") {
    params.set("source", source);
  }

  return `/ops/reports/export?${params.toString()}`;
}

function alertsLink({ farmId, reportWindow, severity, returnTo }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("dateRange", reportWindow);
  if (severity && severity !== "all") {
    params.set("severity", severity);
  }
  if (returnTo) {
    params.set("return_to", returnTo);
  }

  return `/alerts?${params.toString()}`;
}

function recordsLink({ farmId, reportWindow, returnTo }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("dateRange", reportWindow);
  if (returnTo) {
    params.set("return_to", returnTo);
  }
  return `/records?${params.toString()}`;
}

function recordCreateLink({ farmId, farmName, returnTo }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("recorded_for_date", new Date().toISOString().slice(0, 10));
  params.set("summary", `Created from ops report follow-up for ${farmName}.`);
  params.set("return_to", returnTo);
  return `/records/new?${params.toString()}`;
}

export default async function OpsReportsPage({ searchParams }) {
  const messages = await getMessages();
  const { authConfigured, user } = await requireUser({ returnUrl: "/ops/reports" });
  const params = await searchParams;
  const reportWindow = params?.window === "7d" || params?.window === "90d" ? params.window : "30d";
  const severityFilter = params?.severity === "critical" || params?.severity === "warning" ? params.severity : "all";
  const sourceFilter = params?.source === "record" || params?.source === "telemetry" || params?.source === "expectation" || params?.source === "system" ? params.source : "all";
  const createdRecordId = typeof params?.record_created === "string" ? params.record_created : "";
  const updatedRecordId = typeof params?.record_updated === "string" ? params.record_updated : "";
  const updatedAlertId = typeof params?.alert_updated === "string" ? params.alert_updated : "";
  const alertAction = typeof params?.alert_action === "string" ? params.alert_action : "";
  const currentReportUrl = buildReportUrl({ windowValue: reportWindow, severity: severityFilter, source: sourceFilter });
  const ops = user ? await loadOpsOverview({ reportWindow, severityFilter, sourceFilter }) : null;

  return (
    <AppShell currentPath="/ops" ariaLabel="Ops navigation">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {createdRecordId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.recordCreatedTitle", "Record created")}</strong>
          <span> {t(messages, "ops.recordCreatedBody", "A new operational record was created from the reporting workflow.")} </span>
          <Link href={`/records/${createdRecordId}?return_to=${encodeURIComponent(currentReportUrl)}`}>{t(messages, "ops.openCreatedRecordAction", "Open record")}</Link>
        </section>
      ) : null}
      {updatedRecordId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.recordUpdatedTitle", "Record updated")}</strong>
          <span> {t(messages, "ops.recordUpdatedBody", "An operational record was updated and returned to the reporting workflow.")} </span>
          <Link href={`/records/${updatedRecordId}?return_to=${encodeURIComponent(currentReportUrl)}`}>{t(messages, "ops.openCreatedRecordAction", "Open record")}</Link>
        </section>
      ) : null}
      {updatedAlertId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.alertUpdatedTitle", "Alert updated")}</strong>
          <span> {t(messages, "ops.alertUpdatedBody", "An alert action was completed and returned to the reporting workflow.").replace("{action}", alertAction || "updated")} </span>
          <Link href={`/alerts/${updatedAlertId}?return_to=${encodeURIComponent(currentReportUrl)}`}>{t(messages, "ops.openUpdatedAlertAction", "Open alert")}</Link>
        </section>
      ) : null}
      {ops?.authorized && ops.metrics.missingHandoffCount > 0 ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.missingHandoffNoticeTitle", "Handoff coverage needs attention")}</strong>
          <span> {t(messages, "ops.missingHandoffNoticeBody", "Some farms still do not have a recent operator handoff note in the reporting layer.")}</span>
          <span className="pill">{ops.metrics.missingHandoffCount} {t(messages, "ops.missingHandoffs", "farms missing handoff")}</span>
        </section>
      ) : null}

      <section className="ops-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "ops.reportsEyebrow", "Operations reporting")}</p>
          <h1 className="page-title">{t(messages, "ops.reportsTitle", "Export-ready farm reporting")}</h1>
          <p className="lede">{ops?.authorized ? t(messages, "ops.reportsBody", "Use these tables to review discipline gaps, alert pressure, and farm-by-farm operating load before sharing updates with teams or customers.") : t(messages, "ops.notAuthorized")}</p>
        </div>
        {ops?.authorized ? (
          <div className="ops-hero-panel">
            <div className="action-row">
              <Link className="button" href="/ops">{t(messages, "ops.backToOpsAction", "Back to ops")}</Link>
              <Link className="button-secondary" href={exportLink("discipline", reportWindow, severityFilter, sourceFilter)}>{t(messages, "ops.exportDisciplineAction", "Export discipline CSV")}</Link>
              <Link className="button-secondary" href={exportLink("alerts", reportWindow, severityFilter, sourceFilter)}>{t(messages, "ops.exportAlertsAction", "Export alerts CSV")}</Link>
            </div>
            <div className="pill-row">
              <Link className={`pill ${reportWindow === "7d" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: "7d", severity: severityFilter, source: sourceFilter })}>{t(messages, "ops.window7d", "7 days")}</Link>
              <Link className={`pill ${reportWindow === "30d" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: "30d", severity: severityFilter, source: sourceFilter })}>{t(messages, "ops.window30d", "30 days")}</Link>
              <Link className={`pill ${reportWindow === "90d" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: "90d", severity: severityFilter, source: sourceFilter })}>{t(messages, "ops.window90d", "90 days")}</Link>
            </div>
            <div className="pill-row">
              <Link className={`pill ${severityFilter === "all" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: "all", source: sourceFilter })}>{t(messages, "ops.severityAll", "All severities")}</Link>
              <Link className={`pill ${severityFilter === "critical" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: "critical", source: sourceFilter })}>{t(messages, "ops.severityCritical", "Critical")}</Link>
              <Link className={`pill ${severityFilter === "warning" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: "warning", source: sourceFilter })}>{t(messages, "ops.severityWarning", "Warning")}</Link>
            </div>
            <div className="pill-row">
              <Link className={`pill ${sourceFilter === "all" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: severityFilter, source: "all" })}>{t(messages, "ops.sourceAll", "All sources")}</Link>
              <Link className={`pill ${sourceFilter === "record" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: severityFilter, source: "record" })}>{t(messages, "dashboard.alertSources.record", "Record-driven")}</Link>
              <Link className={`pill ${sourceFilter === "telemetry" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: severityFilter, source: "telemetry" })}>{t(messages, "dashboard.alertSources.telemetry", "Telemetry-driven")}</Link>
              <Link className={`pill ${sourceFilter === "expectation" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: severityFilter, source: "expectation" })}>{t(messages, "dashboard.alertSources.expectation", "Expectation-driven")}</Link>
              <Link className={`pill ${sourceFilter === "system" ? "is-online" : ""}`} href={buildReportUrl({ windowValue: reportWindow, severity: severityFilter, source: "system" })}>{t(messages, "dashboard.alertSources.system", "System")}</Link>
            </div>
          </div>
        ) : null}
      </section>

      {ops?.authorized ? (
        <section className="dashboard-grid">
          <article className="card">
            <div className="split-heading">
              <h2>{t(messages, "ops.disciplineReportTitle", "Discipline by farm")}</h2>
              <span className="pill">{ops.reports.disciplineByFarm.length}</span>
            </div>
            {ops.reports.disciplineByFarm.length ? (
              <div className="table-scroll">
                <table className="ops-report-table">
                  <thead>
                    <tr>
                      <th>{t(messages, "ops.reportColumns.farm", "Farm")}</th>
                      <th>{t(messages, "ops.reportColumns.activeTemplates", "Templates")}</th>
                      <th>{t(messages, "ops.reportColumns.currentTemplates", "Current")}</th>
                      <th>{t(messages, "ops.reportColumns.attentionTemplates", "Attention")}</th>
                      <th>{t(messages, "ops.reportColumns.recordsInWindow", "Records")}</th>
                      <th>{t(messages, "ops.reportColumns.expectationAlertsInWindow", "Missing")}</th>
                      <th>{t(messages, "ops.reportColumns.expectationRecoveredLast7Days", "Recovered 7d")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryAvgTemp", "Avg temp")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryBatteryDevices", "Low battery")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryOutcomeRecords", "Telemetry -> record")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryOutcomeAlerts", "Telemetry -> alert")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryOutcomeHandoffs", "Telemetry -> handoff")}</th>
                      <th>{t(messages, "ops.reportColumns.dispatchReady", "Dispatch ready")}</th>
                      <th>{t(messages, "ops.reportColumns.dispatchCoverageMissing", "Dispatch coverage")}</th>
                      <th>{t(messages, "ops.reportColumns.dispatchFollowUpFirst", "Dispatch follow-up")}</th>
                      <th>{t(messages, "ops.reportColumns.latestHandoff", "Latest handoff")}</th>
                      <th>{t(messages, "ops.reportColumns.actions", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.reports.disciplineByFarm.map((row) => (
                      <tr key={row.farmId}>
                        <td><Link href={`/ops/reports/farms/${row.farmId}?window=${reportWindow}&severity=${severityFilter}&source=${sourceFilter}`}>{row.farmName}</Link></td>
                        <td>{row.activeTemplates}</td>
                        <td>{row.currentTemplates}</td>
                        <td>{row.attentionTemplates}</td>
                        <td>{row.recordsInWindow}</td>
                        <td>{row.expectationAlertsInWindow}</td>
                        <td>{row.expectationRecoveredLast7Days}</td>
                        <td>
                          <span className="pill-row">
                            <span>{row.telemetryAverageTemperature === null ? "N/A" : `${Number(row.telemetryAverageTemperature).toFixed(1)} C`}</span>
                            {row.telemetryCriticalHeat ? <span className="pill is-offline">{t(messages, "ops.telemetryCriticalHeat", "Critical heat")}</span> : row.telemetryWarm ? <span className="pill is-stale">{t(messages, "ops.telemetryWarmDrift", "Temp drift")}</span> : null}
                          </span>
                        </td>
                        <td>
                          <span className="pill-row">
                            <span>{row.telemetryLowBatteryDevices}</span>
                            {row.telemetryBatteryPressure ? <span className="pill is-stale">{t(messages, "ops.telemetryBatteryPressure", "Battery pressure")}</span> : null}
                          </span>
                        </td>
                        <td>{row.telemetryOutcomeRecords}</td>
                        <td>{row.telemetryOutcomeAlerts}</td>
                        <td>{row.telemetryOutcomeHandoffs}</td>
                        <td>{row.dispatchReadyCount}</td>
                        <td>{row.dispatchCoverageMissingCount}</td>
                        <td>{row.dispatchFollowUpFirstCount}</td>
                        <td>
                          <span className="pill-row">
                            <span className={`pill ${handoffFreshness(row.latestHandoffAt, messages).className}`}>{handoffFreshness(row.latestHandoffAt, messages).label}</span>
                            {row.latestHandoff || "—"}
                          </span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            <Link className="button-secondary" href={`/ops/reports/farms/${row.farmId}?window=${reportWindow}&severity=${severityFilter}&source=${sourceFilter}`}>{t(messages, "ops.viewReportAction", "View report")}</Link>
                            <Link className="button-secondary" href={alertsLink({ farmId: row.farmId, reportWindow, severity: severityFilter, returnTo: currentReportUrl })}>{t(messages, "ops.viewAlertsAction", "View alerts")}</Link>
                            <Link className="button-secondary" href={recordCreateLink({ farmId: row.farmId, farmName: row.farmName, returnTo: currentReportUrl })}>{t(messages, "ops.createRecordAction", "Create record")}</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">{t(messages, "ops.reportsEmpty", "No report rows are ready yet.")}</p>
            )}
          </article>

          <article className="card">
            <div className="split-heading">
              <h2>{t(messages, "ops.alertReportTitle", "Alert pressure by farm")}</h2>
              <span className="pill">{ops.reports.alertPressureByFarm.length}</span>
            </div>
            {ops.reports.alertPressureByFarm.length ? (
              <div className="table-scroll">
                <table className="ops-report-table">
                  <thead>
                    <tr>
                      <th>{t(messages, "ops.reportColumns.farm", "Farm")}</th>
                      <th>{t(messages, "ops.reportColumns.devicesTotal", "Devices")}</th>
                      <th>{t(messages, "ops.reportColumns.devicesNeedingAttention", "Devices attention")}</th>
                      <th>{t(messages, "ops.reportColumns.openAlerts", "Open alerts")}</th>
                      <th>{t(messages, "ops.reportColumns.criticalAlerts", "Critical")}</th>
                      <th>{t(messages, "ops.reportColumns.recordAlerts", "Record")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryAlerts", "Telemetry")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryAvgTemp", "Avg temp")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryBatteryDevices", "Low battery")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryOutcomeRecords", "Telemetry -> record")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryOutcomeAlerts", "Telemetry -> alert")}</th>
                      <th>{t(messages, "ops.reportColumns.telemetryOutcomeHandoffs", "Telemetry -> handoff")}</th>
                      <th>{t(messages, "ops.reportColumns.dispatchReady", "Dispatch ready")}</th>
                      <th>{t(messages, "ops.reportColumns.dispatchCoverageMissing", "Dispatch coverage")}</th>
                      <th>{t(messages, "ops.reportColumns.dispatchFollowUpFirst", "Dispatch follow-up")}</th>
                      <th>{t(messages, "ops.reportColumns.expectationAlertsOpen", "Expectation")}</th>
                      <th>{t(messages, "ops.reportColumns.latestHandoff", "Latest handoff")}</th>
                      <th>{t(messages, "ops.reportColumns.actions", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.reports.alertPressureByFarm.map((row) => (
                      <tr key={row.farmId}>
                        <td><Link href={`/ops/reports/farms/${row.farmId}?window=${reportWindow}&severity=${severityFilter}&source=${sourceFilter}`}>{row.farmName}</Link></td>
                        <td>{row.devicesTotal}</td>
                        <td>{row.devicesNeedingAttention}</td>
                        <td>{row.openAlerts}</td>
                        <td>{row.criticalAlerts}</td>
                        <td>{row.recordAlerts}</td>
                        <td>{row.telemetryAlerts}</td>
                        <td>
                          <span className="pill-row">
                            <span>{row.telemetryAverageTemperature === null ? "N/A" : `${Number(row.telemetryAverageTemperature).toFixed(1)} C`}</span>
                            {row.telemetryCriticalHeat ? <span className="pill is-offline">{t(messages, "ops.telemetryCriticalHeat", "Critical heat")}</span> : row.telemetryWarm ? <span className="pill is-stale">{t(messages, "ops.telemetryWarmDrift", "Temp drift")}</span> : null}
                          </span>
                        </td>
                        <td>
                          <span className="pill-row">
                            <span>{row.telemetryLowBatteryDevices}</span>
                            {row.telemetryBatteryPressure ? <span className="pill is-stale">{t(messages, "ops.telemetryBatteryPressure", "Battery pressure")}</span> : null}
                          </span>
                        </td>
                        <td>{row.telemetryOutcomeRecords}</td>
                        <td>{row.telemetryOutcomeAlerts}</td>
                        <td>{row.telemetryOutcomeHandoffs}</td>
                        <td>{row.dispatchReadyCount}</td>
                        <td>{row.dispatchCoverageMissingCount}</td>
                        <td>{row.dispatchFollowUpFirstCount}</td>
                        <td>{row.expectationAlertsOpen}</td>
                        <td>
                          <span className="pill-row">
                            <span className={`pill ${handoffFreshness(row.latestHandoffAt, messages).className}`}>{handoffFreshness(row.latestHandoffAt, messages).label}</span>
                            {row.latestHandoff || "—"}
                          </span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            <Link className="button-secondary" href={`/ops/reports/farms/${row.farmId}?window=${reportWindow}&severity=${severityFilter}&source=${sourceFilter}`}>{t(messages, "ops.viewReportAction", "View report")}</Link>
                            <Link className="button-secondary" href={alertsLink({ farmId: row.farmId, reportWindow, severity: severityFilter, returnTo: currentReportUrl })}>{t(messages, "ops.viewAlertsAction", "View alerts")}</Link>
                            <Link className="button-secondary" href={recordsLink({ farmId: row.farmId, reportWindow, returnTo: currentReportUrl })}>{t(messages, "ops.viewRecordsAction", "View records")}</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">{t(messages, "ops.reportsEmpty", "No report rows are ready yet.")}</p>
            )}
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}
