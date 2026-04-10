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
  if (value === "online" || value === "succeeded" || value === "resolved" || value === "current") {
    return "is-online";
  }
  if (value === "offline" || value === "failed" || value === "critical" || value === "attention") {
    return "is-offline";
  }
  return "is-stale";
}

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function followUpStatusClass(value) {
  if (value === "critical") {
    return "is-offline";
  }

  if (value === "warning") {
    return "is-stale";
  }

  return "is-online";
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

function dispatchStateMeta(value, messages) {
  if (value === "coverage-missing") {
    return {
      label: t(messages, "ops.notificationDispatchCoverageMissing", "Coverage missing"),
      className: "is-offline"
    };
  }

  if (value === "follow-up-first") {
    return {
      label: t(messages, "ops.notificationDispatchFollowUpFirst", "Follow-up first"),
      className: "is-stale"
    };
  }

  return {
    label: t(messages, "ops.notificationDispatchReady", "Ready to review"),
    className: "is-online"
  };
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

function telemetryNextStep(farm, messages) {
  if (!farm) {
    return {
      label: t(messages, "ops.telemetryNextStepSnapshot", "Review farm snapshot"),
      reason: t(messages, "ops.telemetryNextStepSnapshotReason", "Open the farm context to inspect the latest telemetry state.")
    };
  }

  if (farm.criticalHeat || farm.openTelemetryAlertCount > 0) {
    return {
      label: t(messages, "ops.reviewTelemetryAlertsAction", "Review telemetry alerts"),
      reason: t(messages, "ops.telemetryNextStepAlertsReason", "Active heat or open telemetry alerts should be reviewed before lower-priority follow-up.")
    };
  }

  if (farm.batteryPressure) {
    return {
      label: t(messages, "ops.telemetryNextStepBattery", "Check battery pressure"),
      reason: t(messages, "ops.telemetryNextStepBatteryReason", "Low-battery devices can quickly turn into visibility gaps if they are left unattended.")
    };
  }

  if (farm.warm) {
    return {
      label: t(messages, "ops.telemetryNextStepHeat", "Inspect farm telemetry"),
      reason: t(messages, "ops.telemetryNextStepHeatReason", "Temperature is drifting outside the preferred band and should be confirmed in farm context.")
    };
  }

  return {
    label: t(messages, "ops.telemetryNextStepSnapshot", "Review farm snapshot"),
    reason: t(messages, "ops.telemetryNextStepSnapshotReason", "Open the farm context to inspect the latest telemetry state.")
  };
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
              <Metric
                labelText={t(messages, "ops.attention")}
                value={ops.metrics.attentionCount}
                meta={`${ops.metrics.criticalAlertCount} ${t(messages, "ops.critical")}`}
              />
            </div>
            <div className="ops-health-strip">
              <span className="health-chip is-online">{ops.metrics.onlineCount} {t(messages, "ops.online")}</span>
              <span className="health-chip is-stale">{staleCount} {t(messages, "ops.stale")}</span>
              <span className="health-chip is-offline">{offlineCount} {t(messages, "ops.offline")}</span>
              <span className={`health-chip ${ops.metrics.missingContactCount ? "is-stale" : "is-online"}`}>
                {ops.metrics.missingContactCount
                  ? `${ops.metrics.missingContactCount} ${t(messages, "ops.missingContacts")}`
                  : t(messages, "ops.contactsReady")}
              </span>
              <span className={`health-chip ${ops.metrics.missingHandoffCount ? "is-stale" : "is-online"}`}>
                {ops.metrics.missingHandoffCount
                  ? `${ops.metrics.missingHandoffCount} ${t(messages, "ops.missingHandoffs", "farms missing handoff")}`
                  : t(messages, "ops.handoffsReady", "Recent handoffs ready")}
              </span>
              <span className="health-chip">
                {ops.metrics.expectationRecoveredCount} {t(messages, "ops.expectationsRecovered", "expectation recoveries")}
              </span>
              <span className="health-chip">{t(messages, "ops.latestHeartbeat")}: {formatDate(latestHeartbeatAt)}</span>
            </div>
            <div className="action-row">
              <Link className="button-secondary" href="/ops/follow-ups">{t(messages, "ops.openFollowUpsAction", "Open follow-up workspace")}</Link>
              <Link className="button-secondary" href="/ops/reports">{t(messages, "ops.openReportsAction", "Open reports")}</Link>
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
              <div className="split-heading">
                <h2>{t(messages, "ops.telemetryPressureTitle", "Telemetry pressure")}</h2>
                <Link className="button-secondary" href="/ops/follow-ups?queue=telemetry-pressure">{t(messages, "ops.openFollowUpsAction", "Open follow-up workspace")}</Link>
              </div>
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryCriticalHeat", "Critical heat")}</h3>
                  <p>{ops.telemetryPressure.criticalHeatFarmCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryWarmFarms", "Warm farms")}</h3>
                  <p>{ops.telemetryPressure.warmFarmCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.telemetryLowBatteryFarms", "Low battery farms")}</h3>
                  <p>{ops.telemetryPressure.lowBatteryFarmCount}</p>
                </article>
              </div>
              {ops.telemetryPressure.byFarm.length ? (
                <ul className="status-list">
                  {ops.telemetryPressure.byFarm.map((farm) => {
                    const nextStep = telemetryNextStep(farm, messages);

                    return (
                    <li className="mobile-list-row" key={farm.farmId}>
                      <span>
                        <Link href={`/farms/${farm.farmId}`}>{farm.farmName}</Link>
                        <span className="list-meta">
                          {t(messages, "ops.telemetryDevicesReporting", "Devices reporting")}: {farm.reportingDeviceCount}
                        </span>
                        <span className="list-meta">
                          {t(messages, "ops.telemetryAverageTemperature", "Avg temp")}: {formatValue(farm.averageTemperature, " C", 1)} · {t(messages, "ops.telemetryAverageBattery", "Avg battery")}: {formatValue(farm.averageBattery, "%", 0)}
                        </span>
                        <span className="list-meta">
                          {t(messages, "ops.followUpNextAction", "Next best action")}: {nextStep.label} Â· {nextStep.reason}
                        </span>
                      </span>
                      <span className="pill-row">
                        {farm.criticalHeat ? <span className="pill is-offline">{t(messages, "ops.telemetryCriticalHeat", "Critical heat")}</span> : null}
                        {farm.warm && !farm.criticalHeat ? <span className="pill is-stale">{t(messages, "ops.telemetryWarmDrift", "Temp drift")}</span> : null}
                        {farm.batteryPressure ? <span className="pill is-stale">{t(messages, "ops.telemetryBatteryPressure", "Battery pressure")}</span> : null}
                        {farm.openTelemetryAlertCount ? <span className="pill">{farm.openTelemetryAlertCount} {t(messages, "ops.telemetryOpenAlerts", "open telemetry alerts")}</span> : null}
                        <Link className="button-secondary" href={`/alerts?farmId=${farm.farmId}&source=device_telemetry&return_to=${encodeURIComponent("/ops")}`}>{t(messages, "ops.reviewTelemetryAlertsAction", "Review telemetry alerts")}</Link>
                        <Link className="button-secondary" href={`/farms/${farm.farmId}`}>{t(messages, "ops.openFarmAction", "Open farm")}</Link>
                      </span>
                    </li>
                  );})}
                </ul>
              ) : <p className="muted">{t(messages, "ops.telemetryPressureEmpty", "No telemetry pressure summary is ready yet.")}</p>}
            </article>

            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.followUpQueueTitle", "Follow-up queue")}</h2>
                <div className="pill-row">
                  <span className="pill">{ops.followUpQueue.length}</span>
                  <Link className="button-secondary" href="/ops/follow-ups">{t(messages, "ops.openFollowUpsAction", "Open follow-up workspace")}</Link>
                </div>
              </div>
              {ops.followUpQueue.length ? (
                <ul className="status-list">
                  {ops.followUpQueue.map((item) => (
                    <li className="mobile-list-row" key={item.key}>
                      <span>
                        <strong>{item.title}</strong>
                        <span className="list-meta">{item.body}</span>
                      </span>
                      <span className="pill-row">
                        <span className={`pill ${followUpStatusClass(item.priority)}`}>{item.priority}</span>
                        <Link className="button-secondary" href={item.primaryHref}>{item.primaryLabel}</Link>
                        <Link className="button-secondary" href={item.secondaryHref}>{item.secondaryLabel}</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "ops.followUpQueueEmpty", "No follow-up queue items are ready right now.")}</p>}
            </article>

            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.notificationDispatchTitle", "Notification dispatch queue")}</h2>
                <Link className="button-secondary" href="/alerts">{t(messages, "alertsPage.viewAllAction", "View all alerts")}</Link>
              </div>
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.notificationDispatchReady", "Ready to review")}</h3>
                  <p>{ops.notificationDispatch.readyCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.notificationDispatchCoverageMissing", "Coverage missing")}</h3>
                  <p>{ops.notificationDispatch.coverageMissingCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.notificationDispatchFollowUpFirst", "Follow-up first")}</h3>
                  <p>{ops.notificationDispatch.followUpFirstCount}</p>
                </article>
              </div>
              <p className="muted">{t(messages, "ops.notificationDispatchBody", "Use this queue to confirm whether open alerts are actually ready for delivery review, blocked by missing coverage, or should be handled operationally first.")}</p>
              {ops.notificationDispatch.items.length ? (
                <ul className="status-list">
                  {ops.notificationDispatch.items.map((item) => {
                    const state = dispatchStateMeta(item.state, messages);

                    return (
                      <li className="mobile-list-row" key={item.id}>
                        <span>
                          <Link href={`/alerts/${item.id}`}>{label(item.alertType)}</Link>
                          <span className="list-meta">{item.farmName} · {alertSourceLabel(item.sourceLabel, messages)} · {item.severity}</span>
                          <span className="list-meta">{item.reason}</span>
                        </span>
                        <span className="pill-row">
                          <span className={`pill ${state.className}`}>{state.label}</span>
                          <span className="pill">{item.recipientCount} {t(messages, "ops.notificationDispatchRecipients", "personal recipients")}</span>
                          <span className="pill">{item.farmFallbackReady ? t(messages, "ops.notificationDispatchFallbackReady", "farm fallback ready") : t(messages, "ops.notificationDispatchFallbackMissing", "farm fallback missing")}</span>
                          <Link className="button-secondary" href={item.primaryHref}>{item.primaryLabel}</Link>
                          <Link className="button-secondary" href={item.secondaryHref}>{item.secondaryLabel}</Link>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="muted">{t(messages, "ops.notificationDispatchEmpty", "No open alerts are waiting in the dispatch review queue right now.")}</p>}
            </article>

            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.telemetryOutcomeTrendsTitle", "Telemetry outcome trends")}</h2>
                <span className="pill">{t(messages, "ops.expectationTrendsWindow", "Last 30 days")}</span>
              </div>
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.followUpCompletionAlert", "Resolved by alert action")}</h3>
                  <p>{ops.telemetryOutcomeTrends.byOutcome.alert_follow_up}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.followUpCompletionRecord", "Resolved by record follow-up")}</h3>
                  <p>{ops.telemetryOutcomeTrends.byOutcome.record_follow_up}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.followUpCompletionHandoff", "Resolved by handoff refresh")}</h3>
                  <p>{ops.telemetryOutcomeTrends.byOutcome.handoff_follow_up}</p>
                </article>
              </div>
              {ops.telemetryOutcomeTrends.byFarm.length ? (
                <ul className="status-list">
                  {ops.telemetryOutcomeTrends.byFarm.map((farm) => (
                    <li className="mobile-list-row" key={farm.farmId}>
                      <span>
                        <Link href={`/ops/reports/farms/${farm.farmId}`}>{farm.farmName}</Link>
                        <span className="list-meta">
                          {t(messages, "ops.telemetryOutcomePattern", "Recent telemetry follow-up pattern")}: {farm.total} total
                        </span>
                        <span className="list-meta">
                          {t(messages, "ops.followUpCompletionAlert", "Resolved by alert action")}: {farm.alert_follow_up} Â· {t(messages, "ops.followUpCompletionRecord", "Resolved by record follow-up")}: {farm.record_follow_up} Â· {t(messages, "ops.followUpCompletionHandoff", "Resolved by handoff refresh")}: {farm.handoff_follow_up}
                        </span>
                      </span>
                      <span className="pill-row">
                        <Link className="button-secondary" href={`/ops/reports/farms/${farm.farmId}`}>{t(messages, "ops.openFarmReportAction", "Open farm report")}</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "ops.telemetryOutcomeTrendsEmpty", "Telemetry follow-up outcomes will appear here after the team works through telemetry pressure items.")}</p>}
            </article>

            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.alertBreakdownTitle", "Alert breakdown")}</h2>
                <Link className="button-secondary" href="/alerts">{t(messages, "alertsPage.viewAllAction", "View all alerts")}</Link>
              </div>
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "dashboard.alertSources.record", "Record-driven")}</h3>
                  <p>{ops.alertMetrics.bySource.record}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "dashboard.alertSources.telemetry", "Telemetry-driven")}</h3>
                  <p>{ops.alertMetrics.bySource.telemetry}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "dashboard.alertSources.expectation", "Expectation-driven")}</h3>
                  <p>{ops.alertMetrics.bySource.expectation}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "dashboard.alertSources.system", "System")}</h3>
                  <p>{ops.alertMetrics.bySource.system}</p>
                </article>
              </div>
              <div className="record-meta-list">
                {ops.alertMetrics.topTypes.length ? (
                  ops.alertMetrics.topTypes.map((item) => (
                    <span key={item.alertType}>
                      {label(item.alertType)}: {item.count}
                    </span>
                  ))
                ) : (
                  <span>{t(messages, "ops.alertBreakdownEmpty", "No active alert types to summarize yet.")}</span>
                )}
              </div>
            </article>

            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.expectationSummaryTitle", "Record discipline")}</h2>
                <Link className="button-secondary" href="/records">{t(messages, "dashboard.viewAllRecords", "View all records")}</Link>
              </div>
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.expectationCurrent", "Current")}</h3>
                  <p>{ops.expectationMetrics.currentCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.expectationAttention", "Needs attention")}</h3>
                  <p>{ops.expectationMetrics.attentionCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "ops.expectationRecovered", "Recovered this week")}</h3>
                  <p>{ops.expectationMetrics.recoveredCount}</p>
                </article>
              </div>
              <p className="muted">{t(messages, "ops.expectationSummaryBody", "Use this section to track whether assigned record templates are being completed on time across all farms.")}</p>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.expectationTrendsByFarm", "Most affected farms")}</h2>
                <span className="pill">{t(messages, "ops.expectationTrendsWindow", "Last 30 days")}</span>
              </div>
              {ops.expectationTrends.byFarm.length ? (
                <ul className="status-list">
                  {ops.expectationTrends.byFarm.map((item) => (
                    <li className="mobile-list-row" key={item.farmId}>
                      <span>
                        <Link href={`/farms/${item.farmId}`}>{item.farmName}</Link>
                      </span>
                      <span className="pill">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t(messages, "ops.expectationTrendsEmpty", "No missing-record trend data yet.")}</p>
              )}
            </article>

            <article className="card">
              <div className="split-heading">
                <h2>{t(messages, "ops.expectationTrendsByTemplate", "Most missed templates")}</h2>
                <span className="pill">{t(messages, "ops.expectationTrendsWindow", "Last 30 days")}</span>
              </div>
              {ops.expectationTrends.byTemplate.length ? (
                <ul className="status-list">
                  {ops.expectationTrends.byTemplate.map((item) => (
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
                <p className="muted">{t(messages, "ops.expectationTrendsEmpty", "No missing-record trend data yet.")}</p>
              )}
            </article>
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
                    <li className="mobile-list-row" key={alert.id}>
                      <span>
                        <Link href={`/alerts/${alert.id}`}>{label(alert.alert_type)}</Link>
                        <span className="list-meta">{alert.devices?.serial_number ?? alert.devices?.device_id ?? ""}</span>
                        <span className="list-meta">{alertSourceLabel(alert.sourceLabel, messages)}</span>
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
              <div className="record-meta-list">
                <span>{t(messages, "ops.contactsReady", "All farm contacts ready")}: {ops.metrics.farmsWithDeliveryCoverage}</span>
                <span>{t(messages, "ops.notificationEmailCoverage", "Email coverage")}: {ops.notificationCoverage.emailEnabledFarmCount}</span>
                <span>{t(messages, "ops.notificationLineCoverage", "LINE coverage")}: {ops.notificationCoverage.lineEnabledFarmCount}</span>
              </div>
              {ops.farms.length ? (
                <ul className="status-list">
                  {ops.notificationCoverage.byFarm.slice(0, 16).map((farm) => (
                    <li key={farm.farmId} className="stacked-row">
                      <div>
                        <Link href={`/farms/${farm.farmId}`}>{farm.farmName}</Link>
                        <span className="muted">{farm.hasCoverage ? t(messages, "ops.notificationCoverageReady", "Delivery coverage ready") : t(messages, "ops.notificationCoverageMissing", "Delivery coverage missing")}</span>
                      </div>
                      <div className="pill-row">
                        <span className="pill">{farm.farmEmailConfigured ? t(messages, "ops.notificationFarmEmailReady", "farm email") : t(messages, "ops.notificationFarmEmailMissing", "no farm email")}</span>
                        <span className="pill">{farm.farmLineConfigured ? t(messages, "ops.notificationFarmLineReady", "farm LINE") : t(messages, "ops.notificationFarmLineMissing", "no farm LINE")}</span>
                        <span className="pill">{farm.emailEnabledCount} {t(messages, "ops.notificationEmailRecipients", "email recipients")}</span>
                        <span className="pill">{farm.lineEnabledCount} {t(messages, "ops.notificationLineRecipients", "LINE recipients")}</span>
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
