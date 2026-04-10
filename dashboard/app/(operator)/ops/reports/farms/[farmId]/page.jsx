import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { SubmitButton } from "@/components/submit-button.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOpsFarmReport } from "@/lib/data/ops-overview.js";
import { saveOpsHandoffNote } from "@/app/(operator)/ops/follow-ups/actions.js";

export const dynamic = "force-dynamic";

function buildFarmReportUrl({ farmId, windowValue, severity, source }) {
  const params = new URLSearchParams();
  params.set("window", windowValue);
  if (severity && severity !== "all") {
    params.set("severity", severity);
  }
  if (source && source !== "all") {
    params.set("source", source);
  }

  return `/ops/reports/farms/${farmId}?${params.toString()}`;
}

function farmAlertsLink({ farmId, reportWindow, severity, returnTo }) {
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

function farmRecordsLink({ farmId, reportWindow, returnTo }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("dateRange", reportWindow);
  if (returnTo) {
    params.set("return_to", returnTo);
  }
  return `/records?${params.toString()}`;
}

function farmRecordCreateLink({ farmId, farmName, returnTo }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("recorded_for_date", new Date().toISOString().slice(0, 10));
  params.set("summary", `Created from ops report follow-up for ${farmName}.`);
  params.set("return_to", returnTo);
  return `/records/new?${params.toString()}`;
}

function farmTemplateRecordCreateLink({ farmId, templateId, farmName, templateName, returnTo }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("templateId", templateId);
  params.set("recorded_for_date", new Date().toISOString().slice(0, 10));
  params.set("summary", `Created from ops report follow-up for ${farmName} using template ${templateName}.`);
  params.set("return_to", returnTo);
  return `/records/new?${params.toString()}`;
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

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function formatValue(value, suffix = "", digits = 0) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value);
  }

  return `${number.toFixed(digits)}${suffix}`;
}

function sparklinePath(points = []) {
  if (!points.length) {
    return "";
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

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

function telemetryOutcomeLabel(value, messages) {
  if (value === "alert_follow_up") {
    return t(messages, "ops.followUpCompletionAlert", "Resolved by alert action");
  }

  if (value === "record_follow_up") {
    return t(messages, "ops.followUpCompletionRecord", "Resolved by record follow-up");
  }

  if (value === "handoff_follow_up") {
    return t(messages, "ops.followUpCompletionHandoff", "Resolved by handoff refresh");
  }

  return t(messages, "ops.telemetryOutcomeUnknown", "Unknown outcome");
}

function preferredTelemetryOutcome(report) {
  const byOutcome = report?.telemetryOutcomeTrends?.byOutcome ?? {};
  const candidates = [
    { key: "record_follow_up", count: byOutcome.record_follow_up ?? 0 },
    { key: "alert_follow_up", count: byOutcome.alert_follow_up ?? 0 },
    { key: "handoff_follow_up", count: byOutcome.handoff_follow_up ?? 0 }
  ].sort((left, right) => right.count - left.count);

  return candidates[0]?.count > 0 ? candidates[0].key : "";
}

function buildTelemetrySuggestions({ report, farmId, reportWindow, severityFilter, returnTo, messages }) {
  if (!report?.telemetryPressure && !report?.telemetryTimeline) {
    return [];
  }

  const suggestions = [];
  const telemetryPressure = report.telemetryPressure ?? null;
  const timelineMetrics = report.telemetryTimeline?.metrics ?? {};
  const latestHandoffAt = report?.latestHandoff?.created_at ?? null;
  const handoffAge = latestHandoffAt ? Math.floor((Date.now() - new Date(latestHandoffAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const hasTelemetryAlerts = (telemetryPressure?.openTelemetryAlertCount ?? 0) > 0;
  const hasRecordGap = (report?.metrics?.attentionTemplates ?? 0) > 0;
  const averageTemperature = Number(timelineMetrics.averageTemperature ?? telemetryPressure?.averageTemperature);
  const minimumBattery = Number(timelineMetrics.minBattery ?? telemetryPressure?.averageBattery);
  const highestTemperature = Number(timelineMetrics.maxTemperature ?? telemetryPressure?.averageTemperature);
  const preferredOutcome = preferredTelemetryOutcome(report);

  if (telemetryPressure?.criticalHeat) {
    suggestions.push({
      key: "critical-heat",
      urgencyClass: "is-offline",
      label: t(messages, "ops.telemetrySuggestionUrgent", "Urgent"),
      title: t(messages, "ops.telemetrySuggestionCriticalHeatTitle", "Escalate telemetry heat pressure first"),
      body: t(messages, "ops.telemetrySuggestionCriticalHeatBody", "Average or peak temperature is in a critical range. Review telemetry alerts before handling lower-priority farm work."),
      actionLabel: t(messages, "ops.reviewTelemetryAlertsAction", "Review telemetry alerts"),
      href: `${farmAlertsLink({ farmId, reportWindow, severity: severityFilter, returnTo })}&source=device_telemetry`
    });
  } else if (telemetryPressure?.warm || (Number.isFinite(averageTemperature) && (averageTemperature < 26 || averageTemperature > 30))) {
    suggestions.push({
      key: "warm-drift",
      urgencyClass: "is-stale",
      label: t(messages, "ops.telemetrySuggestionSoon", "Soon"),
      title: t(messages, "ops.telemetrySuggestionWarmTitle", "Inspect the farm telemetry snapshot"),
      body: t(messages, "ops.telemetrySuggestionWarmBody", "Temperature is drifting outside the preferred band. Check the farm snapshot and confirm whether this is a real operating change or a temporary fluctuation."),
      actionLabel: t(messages, "ops.openFarmSettingsAction", "Open farm settings"),
      href: `/farms/${farmId}`
    });
  }

  if (telemetryPressure?.batteryPressure || (Number.isFinite(minimumBattery) && minimumBattery <= 20)) {
    suggestions.push({
      key: "battery-pressure",
      urgencyClass: "is-stale",
      label: t(messages, "ops.telemetrySuggestionSoon", "Soon"),
      title: t(messages, "ops.telemetrySuggestionBatteryTitle", "Check low-battery devices before they go stale"),
      body: t(messages, "ops.telemetrySuggestionBatteryBody", "Battery pressure is building in this farm. Review the farm context and plan maintenance before device visibility drops."),
      actionLabel: t(messages, "ops.openFarmSettingsAction", "Open farm settings"),
      href: `/farms/${farmId}`
    });
  }

  if (
    hasRecordGap
    && (
      preferredOutcome === "record_follow_up"
      || ((telemetryPressure?.criticalHeat || telemetryPressure?.warm || hasTelemetryAlerts) && preferredOutcome !== "alert_follow_up")
    )
  ) {
    suggestions.push({
      key: "record-follow-up",
      urgencyClass: "is-online",
      label: t(messages, "ops.telemetrySuggestionOperational", "Operational"),
      title: preferredOutcome === "record_follow_up"
        ? t(messages, "ops.telemetrySuggestionRecordFirstTitle", "This farm usually resolves telemetry pressure with a record first")
        : t(messages, "ops.telemetrySuggestionRecordTitle", "Capture a follow-up record while the telemetry context is fresh"),
      body: preferredOutcome === "record_follow_up"
        ? t(messages, "ops.telemetrySuggestionRecordFirstBody", "Recent follow-up history suggests this farm usually needs structured field context to close telemetry pressure cleanly, so start with a record.")
        : t(messages, "ops.telemetrySuggestionRecordBody", "This farm still has record expectations needing attention. Create a record now so the telemetry change is tied back to structured field context."),
      actionLabel: t(messages, "ops.createRecordAction", "Create record"),
      href: farmRecordCreateLink({ farmId, farmName: report?.farm?.name ?? "this farm", returnTo })
    });
  }

  if (preferredOutcome === "handoff_follow_up" && (!latestHandoffAt || (handoffAge !== null && handoffAge > 1))) {
    suggestions.push({
      key: "handoff-pattern",
      urgencyClass: "is-stale",
      label: t(messages, "ops.telemetrySuggestionContext", "Context"),
      title: t(messages, "ops.telemetrySuggestionHandoffPatternTitle", "This farm often needs a fresh handoff to close telemetry pressure"),
      body: t(messages, "ops.telemetrySuggestionHandoffPatternBody", "Recent outcomes show this farm often stabilizes only after the operator context is refreshed, so leave the next shift a clear note."),
      actionLabel: t(messages, "ops.followUpHandoffAction", "Save handoff note"),
      href: "#farm-handoff-note"
    });
  }

  if (!latestHandoffAt || (handoffAge !== null && handoffAge > 3)) {
    suggestions.push({
      key: "handoff-refresh",
      urgencyClass: !latestHandoffAt ? "is-offline" : "is-stale",
      label: t(messages, "ops.telemetrySuggestionContext", "Context"),
      title: t(messages, "ops.telemetrySuggestionHandoffTitle", "Refresh the operator handoff before context drifts"),
      body: !latestHandoffAt
        ? t(messages, "ops.telemetrySuggestionHandoffMissingBody", "No recent handoff note is attached to this farm yet. Leave one after reviewing the telemetry state so the next shift inherits the same context.")
        : t(messages, "ops.telemetrySuggestionHandoffStaleBody", "The latest handoff is getting stale. Refresh it after the telemetry review so the next operator sees the updated risk picture."),
      actionLabel: t(messages, "ops.followUpHandoffAction", "Save handoff note"),
      href: "#farm-handoff-note"
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      key: "monitor",
      urgencyClass: "is-online",
      label: t(messages, "ops.telemetrySuggestionSteady", "Steady"),
      title: t(messages, "ops.telemetrySuggestionMonitorTitle", "Telemetry looks stable enough to keep monitoring"),
      body: Number.isFinite(highestTemperature)
        ? t(messages, "ops.telemetrySuggestionMonitorBody", "Telemetry is currently inside a manageable band. Keep watching the trend and only escalate if the next readings continue to drift.")
        : t(messages, "ops.telemetrySuggestionMonitorEmptyBody", "There is not enough telemetry pressure right now to force a follow-up action. Keep the farm under routine review."),
      actionLabel: t(messages, "ops.openFarmSettingsAction", "Open farm settings"),
      href: `/farms/${farmId}`
    });
  }

  return suggestions.slice(0, 5);
}

export default async function OpsFarmReportPage({ params, searchParams }) {
  const messages = await getMessages();
  const { farmId } = await params;
  const query = await searchParams;
  const reportWindow = query?.window === "7d" || query?.window === "90d" ? query.window : "30d";
  const severityFilter = query?.severity === "critical" || query?.severity === "warning" ? query.severity : "all";
  const sourceFilter = query?.source === "record" || query?.source === "telemetry" || query?.source === "expectation" || query?.source === "system" ? query.source : "all";
  const createdRecordId = typeof query?.record_created === "string" ? query.record_created : "";
  const updatedRecordId = typeof query?.record_updated === "string" ? query.record_updated : "";
  const updatedAlertId = typeof query?.alert_updated === "string" ? query.alert_updated : "";
  const alertAction = typeof query?.alert_action === "string" ? query.alert_action : "";
  const handoffSaved = typeof query?.handoff_saved === "string" ? query.handoff_saved : "";
  const handoffError = typeof query?.handoff_error === "string" ? query.handoff_error : "";
  const returnTo = buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: severityFilter, source: sourceFilter });
  const { authConfigured, user } = await requireUser({ returnUrl: `/ops/reports/farms/${farmId}` });
  const report = user ? await loadOpsFarmReport({ farmId, reportWindow, severityFilter, sourceFilter }) : null;
  const handoffFreshnessState = handoffFreshness(report?.latestHandoff?.created_at, messages);
  const telemetrySuggestions = buildTelemetrySuggestions({ report, farmId, reportWindow, severityFilter, returnTo, messages });

  return (
    <AppShell currentPath="/ops" ariaLabel="Ops navigation">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {createdRecordId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.recordCreatedTitle", "Record created")}</strong>
          <span> {t(messages, "ops.recordCreatedBody", "A new operational record was created from the reporting workflow.")} </span>
          <Link href={`/records/${createdRecordId}?return_to=${encodeURIComponent(returnTo)}`}>{t(messages, "ops.openCreatedRecordAction", "Open record")}</Link>
        </section>
      ) : null}
      {updatedRecordId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.recordUpdatedTitle", "Record updated")}</strong>
          <span> {t(messages, "ops.recordUpdatedBody", "An operational record was updated and returned to the reporting workflow.")} </span>
          <Link href={`/records/${updatedRecordId}?return_to=${encodeURIComponent(returnTo)}`}>{t(messages, "ops.openCreatedRecordAction", "Open record")}</Link>
        </section>
      ) : null}
      {updatedAlertId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.alertUpdatedTitle", "Alert updated")}</strong>
          <span> {t(messages, "ops.alertUpdatedBody", "An alert action was completed and returned to the reporting workflow.").replace("{action}", alertAction || "updated")} </span>
          <Link href={`/alerts/${updatedAlertId}?return_to=${encodeURIComponent(returnTo)}`}>{t(messages, "ops.openUpdatedAlertAction", "Open alert")}</Link>
        </section>
      ) : null}
      {handoffSaved ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpHandoffSavedTitle", "Handoff note saved")}</strong>
          <span> {t(messages, "ops.followUpHandoffSavedBody", "The latest operator handoff note is now attached to this farm context.")}</span>
        </section>
      ) : null}
      {handoffError ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpHandoffErrorTitle", "Handoff note issue")}</strong>
          <span> {t(messages, `ops.followUpHandoffErrors.${handoffError}`, "The handoff note could not be saved from this workspace.")}</span>
        </section>
      ) : null}

      <section className="farm-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "ops.farmReportEyebrow", "Farm reporting")}</p>
          <h1 className="page-title">{report?.farm?.name ?? t(messages, "farmSettings.notFoundTitle", "Farm unavailable")}</h1>
          <p className="lede">{t(messages, "ops.farmReportBody", "Use this page to review one farm's alert pressure, record discipline, and expectation gaps for the selected reporting window.")}</p>
          <div className="action-row">
            <Link className="button-secondary" href={`/ops/reports?window=${reportWindow}&severity=${severityFilter}&source=${sourceFilter}`}>{t(messages, "ops.backToReportsAction", "Back to reports")}</Link>
            <Link className="button-secondary" href={`/farms/${farmId}`}>{t(messages, "ops.openFarmSettingsAction", "Open farm settings")}</Link>
            <Link className="button-secondary" href={farmAlertsLink({ farmId, reportWindow, severity: severityFilter, returnTo })}>{t(messages, "ops.viewAlertsAction", "View alerts")}</Link>
            <Link className="button-secondary" href={farmRecordsLink({ farmId, reportWindow, returnTo })}>{t(messages, "ops.viewRecordsAction", "View records")}</Link>
            <Link className="button-secondary" href={farmRecordCreateLink({ farmId, farmName: report?.farm?.name ?? "this farm", returnTo })}>{t(messages, "ops.createRecordAction", "Create record")}</Link>
          </div>
        </div>

        <div className="farm-hero-panel">
          <div className="metric-grid compact-grid">
            <article className="metric">
              <span className="muted">{t(messages, "ops.reportColumns.activeTemplates", "Templates")}</span>
              <span className="metric-value">{report?.metrics.activeTemplates ?? 0}</span>
            </article>
            <article className="metric">
              <span className="muted">{t(messages, "ops.reportColumns.recordsInWindow", "Records")}</span>
              <span className="metric-value">{report?.metrics.recordsInWindow ?? 0}</span>
            </article>
            <article className="metric">
              <span className="muted">{t(messages, "ops.reportColumns.openAlerts", "Open alerts")}</span>
              <span className="metric-value">{report?.metrics.openAlerts ?? 0}</span>
            </article>
            <article className="metric">
              <span className="muted">{t(messages, "ops.reportColumns.criticalAlerts", "Critical")}</span>
              <span className="metric-value">{report?.metrics.criticalAlerts ?? 0}</span>
            </article>
          </div>
          <div className="pill-row">
            <span className="pill">{reportWindow}</span>
            <span className="pill">{report?.metrics.currentTemplates ?? 0} {t(messages, "ops.expectationCurrent", "Current")}</span>
            <span className="pill">{report?.metrics.attentionTemplates ?? 0} {t(messages, "ops.expectationAttention", "Needs attention")}</span>
            <span className="pill">{report?.metrics.expectationRecoveredLast7Days ?? 0} {t(messages, "ops.expectationRecovered", "Recovered this week")}</span>
          </div>
          <div className="pill-row">
            <Link className={`pill ${severityFilter === "all" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: "all", source: sourceFilter })}>{t(messages, "ops.severityAll", "All severities")}</Link>
            <Link className={`pill ${severityFilter === "critical" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: "critical", source: sourceFilter })}>{t(messages, "ops.severityCritical", "Critical")}</Link>
            <Link className={`pill ${severityFilter === "warning" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: "warning", source: sourceFilter })}>{t(messages, "ops.severityWarning", "Warning")}</Link>
          </div>
          <div className="pill-row">
            <Link className={`pill ${sourceFilter === "all" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: severityFilter, source: "all" })}>{t(messages, "ops.sourceAll", "All sources")}</Link>
            <Link className={`pill ${sourceFilter === "record" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: severityFilter, source: "record" })}>{t(messages, "dashboard.alertSources.record", "Record-driven")}</Link>
            <Link className={`pill ${sourceFilter === "telemetry" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: severityFilter, source: "telemetry" })}>{t(messages, "dashboard.alertSources.telemetry", "Telemetry-driven")}</Link>
            <Link className={`pill ${sourceFilter === "expectation" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: severityFilter, source: "expectation" })}>{t(messages, "dashboard.alertSources.expectation", "Expectation-driven")}</Link>
            <Link className={`pill ${sourceFilter === "system" ? "is-online" : ""}`} href={buildFarmReportUrl({ farmId, windowValue: reportWindow, severity: severityFilter, source: "system" })}>{t(messages, "dashboard.alertSources.system", "System")}</Link>
          </div>
        </div>
      </section>

      {report?.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {report.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.telemetryPressureTitle", "Telemetry pressure")}</h2>
            <span className="pill">{report?.telemetryPressure?.reportingDeviceCount ?? 0}</span>
          </div>
          {report?.telemetryPressure ? (
            <>
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryDevicesReporting", "Devices reporting")}</h3>
                  <p>{report.telemetryPressure.reportingDeviceCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryAverageTemperature", "Avg temp")}</h3>
                  <p>{formatValue(report.telemetryPressure.averageTemperature, " C", 1)}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryAverageBattery", "Avg battery")}</h3>
                  <p>{formatValue(report.telemetryPressure.averageBattery, "%", 0)}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryLowBatteryFarms", "Low battery farms")}</h3>
                  <p>{report.telemetryPressure.lowBatteryDeviceCount ?? 0}</p>
                </article>
              </div>
              <div className="pill-row">
                {report.telemetryPressure.criticalHeat ? <span className="pill is-offline">{t(messages, "ops.telemetryCriticalHeat", "Critical heat")}</span> : null}
                {report.telemetryPressure.warm && !report.telemetryPressure.criticalHeat ? <span className="pill is-stale">{t(messages, "ops.telemetryWarmDrift", "Temp drift")}</span> : null}
                {report.telemetryPressure.batteryPressure ? <span className="pill is-stale">{t(messages, "ops.telemetryBatteryPressure", "Battery pressure")}</span> : null}
                {report.telemetryPressure.openTelemetryAlertCount ? <span className="pill">{report.telemetryPressure.openTelemetryAlertCount} {t(messages, "ops.telemetryOpenAlerts", "open telemetry alerts")}</span> : null}
                <span className="pill">{t(messages, "ops.latestHeartbeat")}: {formatDate(report.telemetryPressure.latestReportedAt)}</span>
                <Link className="button-secondary" href={`${farmAlertsLink({ farmId, reportWindow, severity: severityFilter, returnTo })}&source=device_telemetry`}>
                  {t(messages, "ops.reviewTelemetryAlertsAction", "Review telemetry alerts")}
                </Link>
              </div>
            </>
          ) : (
            <p className="muted">{t(messages, "ops.telemetryPressureEmpty", "No telemetry pressure summary is ready yet.")}</p>
          )}
        </article>

        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.telemetryTrendTitle", "Telemetry trend")}</h2>
            <span className="pill">{report?.telemetryTimeline?.metrics.sampleCount ?? 0}</span>
          </div>
          {report?.telemetryTimeline?.history?.length ? (
            <div className="telemetry-trend-card">
              <div className="telemetry-trend-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryTemperatureTrend", "Temperature trend")}</h3>
                  <svg className="telemetry-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t(messages, "ops.telemetryTemperatureTrend", "Temperature trend")}>
                    <path d={sparklinePath(report.telemetryTimeline.history.map((item) => Number(item.temperature_c)).filter((value) => Number.isFinite(value)))} />
                  </svg>
                  <div className="record-meta-list">
                    <span>{t(messages, "ops.telemetryAverageLabel", "Average")}: {formatValue(report.telemetryTimeline.metrics.averageTemperature, " C", 1)}</span>
                    <span>{t(messages, "ops.telemetryRangeLabel", "Range")}: {formatValue(report.telemetryTimeline.metrics.minTemperature, " C", 1)} - {formatValue(report.telemetryTimeline.metrics.maxTemperature, " C", 1)}</span>
                  </div>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryBatteryTrend", "Battery trend")}</h3>
                  <svg className="telemetry-sparkline telemetry-sparkline-battery" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t(messages, "ops.telemetryBatteryTrend", "Battery trend")}>
                    <path d={sparklinePath(report.telemetryTimeline.history.map((item) => Number(item.battery_percent)).filter((value) => Number.isFinite(value)))} />
                  </svg>
                  <div className="record-meta-list">
                    <span>{t(messages, "ops.telemetryAverageLabel", "Average")}: {formatValue(report.telemetryTimeline.metrics.averageBattery, "%", 0)}</span>
                    <span>{t(messages, "ops.telemetryLowestLabel", "Lowest")}: {formatValue(report.telemetryTimeline.metrics.minBattery, "%", 0)}</span>
                  </div>
                </article>
              </div>
              <p className="muted">{t(messages, "ops.telemetrySamplesLabel", "Samples")}: {report.telemetryTimeline.metrics.sampleCount}</p>
            </div>
          ) : (
            <p className="muted">{t(messages, "ops.telemetryTrendEmpty", "No telemetry trend history is ready yet.")}</p>
          )}
        </article>

        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.telemetrySuggestionsTitle", "Telemetry-driven next steps")}</h2>
            <span className="pill">{telemetrySuggestions.length}</span>
          </div>
          <p className="muted">{t(messages, "ops.telemetrySuggestionsBody", "Use the pressure, trend, and handoff state together to decide what should happen next in this farm.")}</p>
          <ul className="status-list">
            {telemetrySuggestions.map((item) => (
              <li className="mobile-list-row" key={item.key}>
                <span>
                  <strong>{item.title}</strong>
                  <span className="list-meta">{item.body}</span>
                </span>
                <span className="pill-row">
                  <span className={`pill ${item.urgencyClass}`}>{item.label}</span>
                  <Link className="button-secondary" href={item.href}>{item.actionLabel}</Link>
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.telemetryOutcomeTrendsTitle", "Telemetry outcome trends")}</h2>
            <span className="pill">{report?.telemetryOutcomeHistory?.length ?? 0}</span>
          </div>
          <div className="records-field-group-grid">
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.followUpCompletionAlert", "Resolved by alert action")}</h3>
              <p>{report?.telemetryOutcomeTrends?.byOutcome?.alert_follow_up ?? 0}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.followUpCompletionRecord", "Resolved by record follow-up")}</h3>
              <p>{report?.telemetryOutcomeTrends?.byOutcome?.record_follow_up ?? 0}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.followUpCompletionHandoff", "Resolved by handoff refresh")}</h3>
              <p>{report?.telemetryOutcomeTrends?.byOutcome?.handoff_follow_up ?? 0}</p>
            </article>
          </div>
          {report?.telemetryOutcomeHistory?.length ? (
            <ul className="status-list">
              {report.telemetryOutcomeHistory.map((event) => (
                <li className="mobile-list-row" key={event.id}>
                  <span>
                    <strong>{telemetryOutcomeLabel(event.outcome, messages)}</strong>
                    {event.summary ? <span className="list-meta">{event.summary}</span> : null}
                  </span>
                  <span className="pill-row">
                    <span className="pill">{formatDateTime(event.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "ops.telemetryOutcomeTrendsEmpty", "Telemetry follow-up outcomes will appear here after the team works through telemetry pressure items.")}</p>
          )}
        </article>

        <article className="card">
          <div className="split-heading">
            <div>
              <p className="eyebrow">{t(messages, "ops.followUpHandoffEyebrow", "Operator handoff")}</p>
              <h2>{t(messages, "ops.followUpHandoffTitle", "Leave context for the next person")}</h2>
              <p className="muted">{t(messages, "ops.followUpHandoffBody", "Capture what changed, what still looks risky, or what the next operator should check first.")}</p>
            </div>
            <span className="pill">{report?.farm?.name ?? farmId}</span>
          </div>
          {report?.latestHandoff?.note ? (
            <div className="notice">
              <strong>{t(messages, "ops.followUpLatestHandoffTitle", "Latest note")}</strong>
              <span> {report.latestHandoff.note}</span>
              <span className={`pill ${handoffFreshnessState.className}`}>{handoffFreshnessState.label}</span>
              <span className="pill">{formatDateTime(report.latestHandoff.created_at)}</span>
            </div>
          ) : null}
          {report?.handoffHistory?.length ? (
            <div>
              <p className="eyebrow">{t(messages, "ops.followUpHandoffHistoryEyebrow", "Recent handoff timeline")}</p>
              <ul className="status-list">
                {report.handoffHistory.map((entry) => (
                  <li className="mobile-list-row" key={entry.id}>
                    <span>
                      <strong>{entry.note}</strong>
                    </span>
                    <span className="list-meta">{formatDateTime(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <form action={saveOpsHandoffNote} className="records-filter-form" id="farm-handoff-note">
            <input name="farm_id" type="hidden" value={farmId} />
            <input name="return_to" type="hidden" value={returnTo} />
            <input name="view" type="hidden" value="all" />
            <input name="queue" type="hidden" value="all" />
            <label>
              {t(messages, "ops.followUpHandoffFieldLabel", "Handoff note")}
              <textarea
                name="handoff_note"
                placeholder={t(messages, "ops.followUpHandoffPlaceholder", "Example: Critical alerts were reviewed. Salinity issue is calmer, but the next shift should verify the morning record and confirm farm contacts are up to date.")}
                rows={4}
              />
            </label>
            <div className="records-filter-actions">
              <SubmitButton pendingLabel={t(messages, "ops.followUpHandoffPendingAction", "Saving note...")}>
                {t(messages, "ops.followUpHandoffAction", "Save handoff note")}
              </SubmitButton>
            </div>
          </form>
        </article>

        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.alertReportTitle", "Alert pressure by farm")}</h2>
            <span className="pill">{report?.openAlerts.length ?? 0}</span>
          </div>
          {report?.openAlerts.length ? (
            <ul className="status-list">
              {report.openAlerts.map((alert) => (
                <li className="mobile-list-row" key={alert.id}>
                  <span>
                    <Link href={`/alerts/${alert.id}`}>{label(alert.alert_type)}</Link>
                    <span className="list-meta">{alert.devices?.serial_number ?? alert.devices?.device_id ?? "Farm-level alert"}</span>
                    <span className="list-meta">{alertSourceLabel(alert.sourceLabel, messages)} · {formatDate(alert.opened_at)}</span>
                  </span>
                  <span className="pill">{alert.severity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "ops.noAlerts", "No open alerts.")}</p>
          )}
        </article>

        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.expectationTrendsByTemplate", "Most missed templates")}</h2>
            <span className="pill">{report?.topExpectationTemplates.length ?? 0}</span>
          </div>
          {report?.topExpectationTemplates.length ? (
            <ul className="status-list">
              {report.topExpectationTemplates.map((item) => (
                <li className="mobile-list-row" key={item.templateCode}>
                  <span>
                    <strong>{item.templateName}</strong>
                    <span className="list-meta">{item.templateCode}</span>
                  </span>
                    <span className="pill-row">
                      <span className="pill">{item.count}</span>
                      {item.templateId ? (
                        <Link className="button-secondary" href={farmTemplateRecordCreateLink({ farmId, templateId: item.templateId, farmName: report?.farm?.name ?? "this farm", templateName: item.templateName, returnTo })}>
                        {t(messages, "ops.createRecordAction", "Create record")}
                        </Link>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "ops.expectationTrendsEmpty", "No missing-record trend data yet.")}</p>
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "dashboard.recentRecords", "Recent records")}</h2>
            <Link className="button-secondary" href="/records">{t(messages, "dashboard.viewAllRecords", "View all records")}</Link>
          </div>
          {report?.recentRecords.length ? (
            <ul className="status-list">
              {report.recentRecords.map((record) => {
                const template = Array.isArray(record.record_templates) ? record.record_templates[0] ?? null : record.record_templates ?? null;
                const author = Array.isArray(record.user_profiles) ? record.user_profiles[0] ?? null : record.user_profiles ?? null;

                return (
                  <li className="mobile-list-row" key={record.id}>
                    <span>
                      <Link href={`/records/${record.id}`}>{template?.name ?? "Operational record"}</Link>
                      <span className="list-meta">{formatDate(record.recorded_for_date ?? record.created_at)} · {author?.display_name ?? "Unknown"}</span>
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
        </article>

        <article className="card">
          <div className="split-heading">
            <h2>{t(messages, "ops.farmMetricsTitle", "Farm report snapshot")}</h2>
            <span className="pill">{reportWindow}</span>
          </div>
          <div className="records-field-group-grid">
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.reportColumns.devicesTotal", "Devices")}</h3>
              <p>{report?.metrics.devicesTotal ?? 0}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.reportColumns.devicesNeedingAttention", "Devices attention")}</h3>
              <p>{report?.metrics.devicesNeedingAttention ?? 0}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.reportColumns.expectationAlertsInWindow", "Missing")}</h3>
              <p>{report?.metrics.expectationAlertsInWindow ?? 0}</p>
            </article>
            <article className="records-field-group-card">
              <h3>{t(messages, "ops.reportColumns.expectationRecoveredLast7Days", "Recovered 7d")}</h3>
              <p>{report?.metrics.expectationRecoveredLast7Days ?? 0}</p>
            </article>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
