import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell.jsx";
import { SubmitButton } from "@/components/submit-button.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadFarmSettings } from "@/lib/data/farm-settings.js";
import { assignReseller, createMemberInvite, createMissingRecordAlertAction, updateFarmContactsAction, updateOwnNotificationPreference } from "./actions.js";

export const dynamic = "force-dynamic";

const MEMBER_PERMISSIONS = [
  ["can_receive_alerts", "farmSettings.receiveAlerts", "Receive alerts"],
  ["can_manage_alerts", "farmSettings.manageAlerts", "Manage alerts"],
  ["can_send_commands", "farmSettings.sendCommands", "Send commands"]
];

const RESELLER_PERMISSIONS = [
  ["can_manage_alerts", "farmSettings.manageAlerts", "Manage alerts"],
  ["can_send_safe_commands", "farmSettings.sendSafeCommands", "Send safe commands"]
];

const ALERT_TYPES = [
  ["threshold", "farmSettings.alertTypes.threshold", "Threshold"],
  ["low_battery", "farmSettings.alertTypes.lowBattery", "Low battery"],
  ["sensor_fault", "farmSettings.alertTypes.sensorFault", "Sensor fault"],
  ["offline", "farmSettings.alertTypes.offline", "Offline"]
];

function PermissionPills({ item, messages }) {
  const permissions = [
    item.can_view ? t(messages, "farmSettings.permissionView", "View") : null,
    item.can_receive_alerts ? t(messages, "farmSettings.permissionReceiveAlerts", "Receive alerts") : null,
    item.can_manage_alerts ? t(messages, "farmSettings.permissionManageAlerts", "Manage alerts") : null,
    item.can_send_commands ? t(messages, "farmSettings.permissionCommands", "Commands") : null,
    item.can_send_safe_commands ? t(messages, "farmSettings.permissionSafeCommands", "Safe commands") : null
  ].filter(Boolean);

  return permissions.length ? permissions.map((permission) => <span className="pill" key={permission}>{permission}</span>) : <span className="muted">{t(messages, "farmSettings.viewMode", "View only")}</span>;
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
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

function sourceLabel(value, messages) {
  if (value === "record_detail") {
    return t(messages, "farmSettings.alertSourceRecord", "Record-driven");
  }

  if (value === "device_telemetry") {
    return t(messages, "farmSettings.alertSourceTelemetry", "Telemetry-driven");
  }

  return t(messages, "farmSettings.alertSourceSystem", "System");
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

function farmAlertsLink({ farmId, source }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  if (source) {
    params.set("source", source);
  }

  return `/alerts?${params.toString()}`;
}

function farmRecordCreateLink({ farmId, templateId, farmName, templateName }) {
  const params = new URLSearchParams();
  params.set("farmId", farmId);
  params.set("recorded_for_date", new Date().toISOString().slice(0, 10));
  params.set(
    "summary",
    templateName
      ? `Created from farm telemetry follow-up for ${farmName} using template ${templateName}.`
      : `Created from farm telemetry follow-up for ${farmName}.`
  );

  if (templateId) {
    params.set("templateId", templateId);
  }

  return `/records/new?${params.toString()}`;
}

function telemetrySeries(history = [], key) {
  return history
    .map((row) => Number(row?.[key]))
    .filter((value) => Number.isFinite(value));
}

function average(values = []) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function notificationScenarioLabel(value, messages) {
  if (value === "critical-threshold") {
    return t(messages, "farmSettings.deliveryScenarioCritical", "Critical threshold");
  }

  if (value === "warning-threshold") {
    return t(messages, "farmSettings.deliveryScenarioWarning", "Warning threshold");
  }

  return value;
}

function preferredTelemetryOutcome(summary) {
  const byOutcome = summary?.telemetryOutcomeTrends?.byOutcome ?? {};
  const candidates = [
    { key: "record_follow_up", count: byOutcome.record_follow_up ?? 0 },
    { key: "alert_follow_up", count: byOutcome.alert_follow_up ?? 0 },
    { key: "handoff_follow_up", count: byOutcome.handoff_follow_up ?? 0 }
  ].sort((left, right) => right.count - left.count);

  return candidates[0]?.count > 0 ? candidates[0].key : "";
}

function buildCustomerTelemetryGuidance({ settings, farmId, messages }) {
  const summary = settings?.summary ?? {};
  const telemetry = summary.telemetry ?? { history: [], metrics: {} };
  const expectations = summary.expectations ?? [];
  const latestHandoffAt = summary.latestHandoff?.created_at ?? null;
  const handoffAge = latestHandoffAt ? Math.floor((Date.now() - new Date(latestHandoffAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const temperatureValues = telemetrySeries(telemetry.history, "temperature_c");
  const batteryValues = telemetrySeries(telemetry.history, "battery_percent");
  const averageTemperature = average(temperatureValues);
  const minimumBattery = batteryValues.length ? Math.min(...batteryValues) : null;
  const hasTelemetryAlerts = summary.openAlerts.some((alert) => alert.source === "device_telemetry");
  const hasCriticalHeat = Number.isFinite(averageTemperature) && (averageTemperature < 24 || averageTemperature > 32);
  const hasWarmDrift = Number.isFinite(averageTemperature) && !hasCriticalHeat && (averageTemperature < 26 || averageTemperature > 30);
  const batteryPressure = (telemetry.metrics?.lowBatteryDeviceCount ?? 0) > 0 || (Number.isFinite(minimumBattery) && minimumBattery <= 20);
  const attentionTemplate = expectations.find((item) => item.status === "attention") ?? null;
  const preferredOutcome = preferredTelemetryOutcome(summary);
  const farmName = settings?.farm?.name ?? "this farm";
  const suggestions = [];

  if (hasCriticalHeat) {
    suggestions.push({
      key: "critical-heat",
      urgencyClass: "is-offline",
      label: t(messages, "ops.telemetrySuggestionUrgent", "Urgent"),
      title: t(messages, "ops.telemetrySuggestionCriticalHeatTitle", "Escalate telemetry heat pressure first"),
      body: t(messages, "ops.telemetrySuggestionCriticalHeatBody", "Average or peak temperature is in a critical range. Review telemetry alerts before handling lower-priority farm work."),
      actionLabel: t(messages, "farmSettings.telemetryGuidanceReviewAlertsAction", "Review telemetry alerts"),
      href: farmAlertsLink({ farmId, source: "device_telemetry" })
    });
  } else if (hasWarmDrift) {
    suggestions.push({
      key: "warm-drift",
      urgencyClass: "is-stale",
      label: t(messages, "ops.telemetrySuggestionSoon", "Soon"),
      title: t(messages, "ops.telemetrySuggestionWarmTitle", "Inspect the farm telemetry snapshot"),
      body: t(messages, "ops.telemetrySuggestionWarmBody", "Temperature is drifting outside the preferred band. Check the farm snapshot and confirm whether this is a real operating change or a temporary fluctuation."),
      actionLabel: t(messages, "farmSettings.telemetryGuidanceOpenSnapshotAction", "Review telemetry snapshot"),
      href: "#farm-telemetry-panel"
    });
  }

  if (batteryPressure) {
    suggestions.push({
      key: "battery-pressure",
      urgencyClass: "is-stale",
      label: t(messages, "ops.telemetrySuggestionSoon", "Soon"),
      title: t(messages, "ops.telemetrySuggestionBatteryTitle", "Check low-battery devices before they go stale"),
      body: t(messages, "ops.telemetrySuggestionBatteryBody", "Battery pressure is building in this farm. Review the farm context and plan maintenance before device visibility drops."),
      actionLabel: t(messages, "farmSettings.telemetryGuidanceOpenDevicesAction", "Open devices"),
      href: "#farm-devices-panel"
    });
  }

  if (
    attentionTemplate
    && (
      preferredOutcome === "record_follow_up"
      || ((hasCriticalHeat || hasWarmDrift || hasTelemetryAlerts) && preferredOutcome !== "alert_follow_up")
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
      actionLabel: t(messages, "farmSettings.expectationsCreateRecord", "Create record"),
      href: farmRecordCreateLink({
        farmId,
        templateId: attentionTemplate.template_id,
        farmName,
        templateName: attentionTemplate.template_name
      })
    });
  }

  if (preferredOutcome === "handoff_follow_up" && (!latestHandoffAt || (handoffAge !== null && handoffAge > 1))) {
    suggestions.push({
      key: "handoff-pattern",
      urgencyClass: "is-stale",
      label: t(messages, "ops.telemetrySuggestionContext", "Context"),
      title: t(messages, "ops.telemetrySuggestionHandoffPatternTitle", "This farm often needs a fresh handoff to close telemetry pressure"),
      body: t(messages, "ops.telemetrySuggestionHandoffPatternBody", "Recent outcomes show this farm often stabilizes only after the operator context is refreshed, so leave the next shift a clear note."),
      actionLabel: t(messages, "farmSettings.telemetryGuidanceOpenHandoffAction", "Review operator context"),
      href: "#farm-handoff-panel"
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
      actionLabel: t(messages, "farmSettings.telemetryGuidanceOpenHandoffAction", "Review operator context"),
      href: "#farm-handoff-panel"
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      key: "monitor",
      urgencyClass: "is-online",
      label: t(messages, "ops.telemetrySuggestionSteady", "Steady"),
      title: t(messages, "ops.telemetrySuggestionMonitorTitle", "Telemetry looks stable enough to keep monitoring"),
      body: t(messages, "ops.telemetrySuggestionMonitorBody", "Telemetry is currently inside a manageable band. Keep watching the trend and only escalate if the next readings continue to drift."),
      actionLabel: t(messages, "farmSettings.telemetryGuidanceOpenSnapshotAction", "Review telemetry snapshot"),
      href: "#farm-telemetry-panel"
    });
  }

  return suggestions.slice(0, 4);
}

function inviteCookieName(farmId) {
  return `sb_invite_token_${farmId}`;
}

function inviteAcceptPath(inviteToken) {
  return `/invites/accept?token=${encodeURIComponent(inviteToken)}`;
}

function Panel({ eyebrow, title, body, children, className = "", id }) {
  return (
    <section className={`farm-panel ${className}`.trim()} id={id}>
      <div className="farm-panel-heading">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {body ? <p className="muted">{body}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({ children }) {
  return <div className="farm-empty-state">{children}</div>;
}

function CheckRow({ name, label, defaultChecked = false }) {
  return (
    <label className="settings-check-row">
      <span>{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
    </label>
  );
}

function TelemetryTrendPanel({ telemetry, messages }) {
  const history = telemetry?.history ?? [];
  const temperatureValues = telemetrySeries(history, "temperature_c");
  const batteryValues = telemetrySeries(history, "battery_percent");
  const temperatureAverage = average(temperatureValues);
  const batteryAverage = average(batteryValues);

  if (!history.length) {
    return <EmptyPanel>{t(messages, "farmSettings.noTelemetrySummary", "No telemetry history is available for this farm yet.")}</EmptyPanel>;
  }

  return (
    <div className="telemetry-trend-card">
      <div className="records-field-group-grid">
        <article className="records-field-group-card">
          <h3>{t(messages, "farmSettings.reportingDevicesTitle", "Reporting devices")}</h3>
          <p>{telemetry.metrics.reportingDeviceCount}</p>
          <span className="muted">{t(messages, "farmSettings.lastTelemetrySeen", "Last telemetry")}: {formatDateTime(telemetry.metrics.lastReportedAt)}</span>
        </article>
        <article className="records-field-group-card">
          <h3>{t(messages, "farmSettings.averageTemperatureTitle", "Average temperature")}</h3>
          <p>{formatValue(telemetry.metrics.latestAverageTemperature, " C", 1)}</p>
          <span className="muted">{t(messages, "farmSettings.temperatureSeriesAverage", "Trend avg")}: {formatValue(temperatureAverage, " C", 1)}</span>
        </article>
        <article className="records-field-group-card">
          <h3>{t(messages, "farmSettings.averageBatteryTitle", "Average battery")}</h3>
          <p>{formatValue(telemetry.metrics.latestAverageBattery, "%", 0)}</p>
          <span className="muted">{t(messages, "farmSettings.batterySeriesAverage", "Trend avg")}: {formatValue(batteryAverage, "%", 0)}</span>
        </article>
        <article className="records-field-group-card">
          <h3>{t(messages, "farmSettings.lowBatteryDevicesTitle", "Low battery devices")}</h3>
          <p>{telemetry.metrics.lowBatteryDeviceCount}</p>
          <span className="muted">{t(messages, "farmSettings.telemetrySamples", "Samples")}: {history.reduce((sum, item) => sum + (item.sample_count ?? 0), 0)}</span>
        </article>
      </div>
      <div className="telemetry-trend-grid">
        <article className="records-field-group-card">
          <h3>{t(messages, "farmSettings.temperatureTrendTitle", "Temperature trend")}</h3>
          <svg className="telemetry-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t(messages, "farmSettings.temperatureTrendTitle", "Temperature trend")}>
            <path d={sparklinePath(temperatureValues)} />
          </svg>
          <div className="record-meta-list">
            <span>{t(messages, "farmSettings.averageLabel", "Average")}: {formatValue(temperatureAverage, " C", 1)}</span>
            <span>{t(messages, "farmSettings.lastTelemetrySeen", "Last telemetry")}: {formatDateTime(telemetry.metrics.lastReportedAt)}</span>
          </div>
        </article>
        <article className="records-field-group-card">
          <h3>{t(messages, "farmSettings.batteryTrendTitle", "Battery trend")}</h3>
          <svg className="telemetry-sparkline telemetry-sparkline-battery" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t(messages, "farmSettings.batteryTrendTitle", "Battery trend")}>
            <path d={sparklinePath(batteryValues)} />
          </svg>
          <div className="record-meta-list">
            <span>{t(messages, "farmSettings.averageLabel", "Average")}: {formatValue(batteryAverage, "%", 0)}</span>
            <span>{t(messages, "farmSettings.lowBatteryDevicesTitle", "Low battery devices")}: {telemetry.metrics.lowBatteryDeviceCount}</span>
          </div>
        </article>
      </div>
      {telemetry.latestByDevice.length ? (
        <ul className="status-list">
          {telemetry.latestByDevice.map((reading) => (
            <li className="mobile-list-row" key={reading.device_id}>
              <span>
                <strong>{reading.device_label}</strong>
                <span className="list-meta">{formatDateTime(reading.recorded_at)}</span>
              </span>
              <span className="pill-row">
                <span className="pill">{formatValue(reading.temperature_c, " C", 1)}</span>
                <span className="pill">{formatValue(reading.battery_percent, "%", 0)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default async function FarmSettingsPage({ params, searchParams }) {
  const messages = await getMessages();
  const { farmId } = await params;
  const query = await searchParams;
  const returnTo = typeof query?.return_to === "string" ? query.return_to : "";
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(inviteCookieName(farmId))?.value ?? "";
  const { authConfigured, user } = await requireUser({ returnUrl: `/farms/${farmId}` });
  const settings = user ? await loadFarmSettings({ farmId, actorUserId: user.id }) : null;
  const feedback = ["invite", "reseller", "notification", "error"]
    .map((key) => (typeof query?.[key] === "string" ? `${key}: ${query[key]}` : null))
    .filter(Boolean);
  const hasFarmContacts = Boolean(settings?.farm?.alert_email_to || settings?.farm?.alert_line_user_id);
  const latestAuditAt = settings?.audit[0]?.created_at ?? null;
  const handoffFreshnessState = handoffFreshness(settings?.summary?.latestHandoff?.created_at, messages);
  const telemetryGuidance = buildCustomerTelemetryGuidance({ settings, farmId, messages });
  const preferredOutcome = preferredTelemetryOutcome(settings?.summary);

  return (
    <AppShell currentPath={`/farms/${farmId}`} ariaLabel="Farm settings navigation" className="page-shell placeholder-layout">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {feedback.length ? <section className="notice">{feedback.join(" / ")}</section> : null}

      <section className="farm-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "farmSettings.eyebrow")}</p>
          <h1 className="page-title">{settings?.farm?.name ?? t(messages, "farmSettings.notFoundTitle")}</h1>
          <p className="lede">{settings?.farm ? t(messages, "farmSettings.body") : t(messages, "farmSettings.notFoundBody")}</p>
          <div className="inline-actions">
            {settings?.farm ? <span className="pill">{settings.canManage ? t(messages, "farmSettings.manageMode") : t(messages, "farmSettings.viewMode")}</span> : null}
            {settings?.farm ? <span className="pill">{t(messages, "farmSettings.created")}: {formatDate(settings.farm.created_at)}</span> : null}
          </div>
        </div>

        {settings?.farm ? (
          <div className="farm-hero-panel">
            <div className="metric-grid compact-grid">
              <article className="metric">
                <span className="muted">{t(messages, "farmSettings.members")}</span>
                <span className="metric-value">{settings.members.length}</span>
              </article>
              <article className="metric">
                <span className="muted">{t(messages, "farmSettings.resellers")}</span>
                <span className="metric-value">{settings.resellers.length}</span>
              </article>
              <article className="metric">
                <span className="muted">{t(messages, "farmSettings.audit")}</span>
                <span className="metric-value">{settings.audit.length}</span>
              </article>
              <article className="metric">
                <span className="muted">{t(messages, "farmSettings.devicesTitle", "Devices")}</span>
                <span className="metric-value">{settings.summary.metrics.deviceCount}</span>
              </article>
            </div>
            <div className="farm-contact-strip">
              <span className={`health-chip ${hasFarmContacts ? "is-online" : "is-stale"}`}>
                {hasFarmContacts ? t(messages, "farmSettings.contactsReady") : t(messages, "farmSettings.contactsMissing")}
              </span>
              <span className="health-chip">{t(messages, "farmSettings.latestAudit")}: {formatDate(latestAuditAt)}</span>
            </div>
          </div>
        ) : null}
      </section>

      {settings?.errors.length ? (
        <section className="notice">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {settings.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      {settings?.farm && !settings.canManage ? (
        <section className="notice">{t(messages, "farmSettings.viewOnly")}</section>
      ) : null}

      {settings?.canManage ? (
        <section className="farm-settings-workspace">
          <div className="farm-settings-main">
            <Panel
              eyebrow={t(messages, "farmSettings.opsEyebrow", "Operations summary")}
              title={t(messages, "farmSettings.opsTitle", "What is happening in this farm right now")}
              body={t(messages, "farmSettings.opsBody", "Use this summary to scan devices, records, and alert pressure before moving into settings work.")}
            >
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.devicesTitle", "Devices")}</h3>
                  <p>{settings.summary.metrics.deviceCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.openAlertsTitle", "Open alerts")}</h3>
                  <p>{settings.summary.metrics.openAlertCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.criticalAlertsTitle", "Critical alerts")}</h3>
                  <p>{settings.summary.metrics.criticalAlertCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.recordsTitle", "Recent records")}</h3>
                  <p>{settings.summary.metrics.recordCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.templatesTitle", "Available templates")}</h3>
                  <p>{settings.summary.metrics.templateCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.templatesHealthyTitle", "Templates current")}</h3>
                  <p>{settings.summary.metrics.healthyTemplateCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.templatesAttentionTitle", "Templates needing attention")}</h3>
                  <p>{settings.summary.metrics.attentionTemplateCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.templatesRecoveredTitle", "Recovered this week")}</h3>
                  <p>{settings.summary.metrics.resolvedExpectationCount}</p>
                </article>
              </div>
              <div className="record-meta-list">
                <span>{t(messages, "farmSettings.alertSourceRecord", "Record-driven")}: {settings.summary.metrics.bySource.record}</span>
                <span>{t(messages, "farmSettings.alertSourceTelemetry", "Telemetry-driven")}: {settings.summary.metrics.bySource.telemetry}</span>
                <span>{t(messages, "farmSettings.alertSourceExpectation", "Expectation-driven")}: {settings.summary.metrics.bySource.expectation}</span>
                <span>{t(messages, "farmSettings.alertSourceSystem", "System")}: {settings.summary.metrics.bySource.system}</span>
              </div>
            </Panel>

            <Panel
              id="farm-telemetry-panel"
              eyebrow={t(messages, "farmSettings.telemetryEyebrow", "Telemetry snapshot")}
              title={t(messages, "farmSettings.telemetryTitle", "Recent telemetry across this farm")}
              body={t(messages, "farmSettings.telemetryBody", "Scan reporting coverage, latest averages, and trend direction before drilling into a single device.")}
            >
              <TelemetryTrendPanel telemetry={settings.summary.telemetry} messages={messages} />
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.telemetryGuidanceEyebrow", "Telemetry guidance")}
              title={t(messages, "farmSettings.telemetryGuidanceTitle", "What should this farm do next")}
              body={t(messages, "farmSettings.telemetryGuidanceBody", "Use the latest telemetry, record discipline, and operator context together so the team can decide the next action quickly.")}
            >
              <div className="record-meta-list">
                <span>{t(messages, "farmSettings.telemetryGuidancePattern", "Recent telemetry follow-up pattern")}: {preferredOutcome ? telemetryOutcomeLabel(preferredOutcome, messages) : t(messages, "farmSettings.telemetryGuidancePatternNone", "No pattern yet")}</span>
                <span>{t(messages, "farmSettings.telemetryGuidanceHistory", "Recent outcomes")}: {settings.summary.telemetryOutcomeTrends?.total ?? 0}</span>
              </div>
              <div className="telemetry-suggestions-list">
                {telemetryGuidance.map((item) => (
                  <article className="telemetry-suggestion-card" key={item.key}>
                    <div className="pill-row">
                      <span className={`pill ${item.urgencyClass}`}>{item.label}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p className="muted">{item.body}</p>
                    <Link className="button-secondary" href={item.href}>{item.actionLabel}</Link>
                  </article>
                ))}
              </div>
              {settings.summary.telemetryOutcomeHistory?.length ? (
                <ul className="status-list">
                  {settings.summary.telemetryOutcomeHistory.map((event) => (
                    <li className="mobile-list-row" key={event.id}>
                      <span>
                        <strong>{telemetryOutcomeLabel(event.outcome, messages)}</strong>
                        {event.summary ? <span className="list-meta">{event.summary}</span> : null}
                      </span>
                      <span className="list-meta">{formatDateTime(event.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.alertsEyebrow", "Current alerts")}
              title={t(messages, "farmSettings.openAlertsTitle", "Open alerts")}
              body={t(messages, "farmSettings.alertsBody", "Review the active issues linked to this farm before they escalate or drift across rounds.")}
            >
              {settings.summary.openAlerts.length ? (
                <ul className="status-list">
                  {settings.summary.openAlerts.map((alert) => (
                    <li className="mobile-list-row" key={alert.id}>
                      <span>
                        <Link href={`/alerts/${alert.id}`}>{label(alert.alert_type)}</Link>
                        <span className="list-meta">{alert.devices?.serial_number ?? alert.devices?.device_id ?? "Farm-level alert"}</span>
                        <span className="list-meta">{sourceLabel(alert.source, messages)} Â· {formatDate(alert.opened_at)}</span>
                      </span>
                      <span className="pill-row">
                        <span className="pill">{alert.severity}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noOpenAlerts", "No open alerts for this farm right now.")}</EmptyPanel>}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.recordsEyebrow", "Record activity")}
              title={t(messages, "farmSettings.recordsTitle", "Recent operational records")}
              body={t(messages, "farmSettings.recordsBody", "Recent field records give the team context before alerts or commands are handled.")}
            >
              {settings.summary.recentRecords.length ? (
                <ul className="status-list">
                  {settings.summary.recentRecords.map((record) => (
                    <li className="mobile-list-row" key={record.id}>
                      <span>
                        <Link href={`/records/${record.id}`}>{record.record_templates?.name ?? "Operational record"}</Link>
                        <span className="list-meta">{formatDate(record.recorded_for_date ?? record.created_at)} Â· {record.user_profiles?.display_name ?? "Unknown"}</span>
                        {record.notes_summary ? <span className="list-meta">{record.notes_summary}</span> : null}
                      </span>
                      <span className="pill">{record.record_status ?? "submitted"}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noRecentRecords", "No operational records for this farm yet.")}</EmptyPanel>}
            </Panel>

            <Panel
              id="farm-handoff-panel"
              eyebrow={t(messages, "farmSettings.handoffEyebrow", "Operator handoff")}
              title={t(messages, "farmSettings.handoffTitle", "Latest operator context")}
              body={t(messages, "farmSettings.handoffBody", "Use this note trail to understand what the operator team last changed or what the next shift should verify.")}
            >
              {settings.summary.latestHandoff ? (
                <>
                  <div className="notice">
                    <strong>{t(messages, "farmSettings.latestHandoffTitle", "Latest note")}</strong>
                    <span> {settings.summary.latestHandoff.note}</span>
                    <span className={`pill ${handoffFreshnessState.className}`}>{handoffFreshnessState.label}</span>
                    <span className="pill">{formatDateTime(settings.summary.latestHandoff.created_at)}</span>
                  </div>
                  {settings.summary.handoffHistory.length ? (
                    <ul className="status-list">
                      {settings.summary.handoffHistory.map((entry) => (
                        <li className="mobile-list-row" key={entry.id}>
                          <span>
                            <strong>{entry.note}</strong>
                          </span>
                          <span className="list-meta">{formatDateTime(entry.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <EmptyPanel>{t(messages, "farmSettings.noHandoff", "No operator handoff notes are visible for this farm yet.")}</EmptyPanel>
              )}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.deliveryEyebrow", "Notification delivery")}
              title={t(messages, "farmSettings.deliveryTitle", "Who can receive farm alerts right now")}
              body={t(messages, "farmSettings.deliveryBody", "Use this coverage view to confirm whether alerts from this farm have both fallback contacts and personal recipients behind them.")}
            >
              <div className="records-field-group-grid">
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.deliveryRecipientsTitle", "Recipients")}</h3>
                  <p>{settings.summary.notificationCoverage.memberRecipientCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.deliveryEmailTitle", "Email enabled")}</h3>
                  <p>{settings.summary.notificationCoverage.emailEnabledCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.deliveryLineTitle", "LINE enabled")}</h3>
                  <p>{settings.summary.notificationCoverage.lineEnabledCount}</p>
                </article>
                <article className="records-field-group-card">
                  <h3>{t(messages, "farmSettings.deliveryCriticalOnlyTitle", "Critical only")}</h3>
                  <p>{settings.summary.notificationCoverage.criticalOnlyCount}</p>
                </article>
              </div>
              <div className="record-meta-list">
                <span className={`pill ${settings.summary.notificationCoverage.farmEmailConfigured ? "is-online" : "is-stale"}`}>
                  {settings.summary.notificationCoverage.farmEmailConfigured
                    ? t(messages, "farmSettings.deliveryFarmEmailReady", "Farm email ready")
                    : t(messages, "farmSettings.deliveryFarmEmailMissing", "Farm email missing")}
                </span>
                <span className={`pill ${settings.summary.notificationCoverage.farmLineConfigured ? "is-online" : "is-stale"}`}>
                  {settings.summary.notificationCoverage.farmLineConfigured
                    ? t(messages, "farmSettings.deliveryFarmLineReady", "Farm LINE ready")
                    : t(messages, "farmSettings.deliveryFarmLineMissing", "Farm LINE missing")}
                </span>
              </div>
              {settings.summary.notificationCoverage.scenarios?.length ? (
                <div className="records-field-group-grid">
                  {settings.summary.notificationCoverage.scenarios.map((scenario) => (
                    <article className="records-field-group-card" key={scenario.key}>
                      <h3>{notificationScenarioLabel(scenario.key, messages)}</h3>
                      <p>{scenario.personalRecipientCount}</p>
                      <span className="muted">
                        {t(messages, "farmSettings.deliveryScenarioBody", "Recipients if this alert opened now")}
                      </span>
                      <div className="record-meta-list">
                        <span>{t(messages, "farmSettings.emailChannel", "Email")}: {scenario.emailRecipientCount}</span>
                        <span>{t(messages, "farmSettings.lineChannel", "LINE")}: {scenario.lineRecipientCount}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              {settings.summary.notificationCoverage.recipients.length ? (
                <ul className="status-list">
                  {settings.summary.notificationCoverage.recipients.map((recipient) => (
                    <li className="mobile-list-row" key={recipient.user_id}>
                      <span>
                        <strong>{recipient.display_name || recipient.email}</strong>
                        <span className="list-meta">{recipient.email}</span>
                        <span className="list-meta">{recipient.role}</span>
                      </span>
                      <span className="pill-row">
                        {recipient.email_enabled ? <span className="pill">{t(messages, "farmSettings.emailChannel", "Email")}</span> : null}
                        {recipient.line_enabled ? <span className="pill">{t(messages, "farmSettings.lineChannel", "LINE")}</span> : null}
                        {recipient.critical_only ? <span className="pill">{t(messages, "farmSettings.deliveryCriticalOnlyBadge", "Critical only")}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyPanel>{t(messages, "farmSettings.deliveryEmpty", "No personal delivery recipients are configured for this farm yet.")}</EmptyPanel>
              )}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.templatesEyebrow", "Record templates")}
              title={t(messages, "farmSettings.templatesTitle", "Available templates")}
              body={t(messages, "farmSettings.templatesBody", "These are the active record templates currently available to this farm based on template scope and farm assignment rules.")}
            >
              {settings.summary.templates.length ? (
                <ul className="status-list">
                  {settings.summary.templates.map((template) => (
                    <li className="mobile-list-row" key={template.id}>
                      <span>
                        <Link href="/records/templates">{template.name}</Link>
                        <span className="list-meta">{template.code}</span>
                        {template.description ? <span className="list-meta">{template.description}</span> : null}
                      </span>
                      <span className="pill-row">
                        <span className="pill">{template.field_count} {t(messages, "farmSettings.templateFields", "fields")}</span>
                        <span className="pill">{template.scope_type ?? "farm"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noTemplates", "No active record templates are available to this farm yet.")}</EmptyPanel>}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.expectationsEyebrow", "Record expectations")}
              title={t(messages, "farmSettings.expectationsTitle", "Which templates have fresh records")}
              body={t(messages, "farmSettings.expectationsBody", "Use this check to see whether each available template already has a recent record in the last 7 days.")}
            >
              {settings.summary.expectations.length ? (
                <ul className="status-list">
                  {settings.summary.expectations.map((item) => (
                    <li className="mobile-list-row" key={item.template_id}>
                      <span>
                        <strong>{item.template_name}</strong>
                        <span className="list-meta">{item.template_code}</span>
                        <span className="list-meta">
                          {item.latest_recorded_for
                            ? `${t(messages, "farmSettings.expectationsLastRecord", "Last record")}: ${formatDate(item.latest_recorded_for)}`
                            : t(messages, "farmSettings.expectationsMissing", "No recent record found yet.")}
                        </span>
                      </span>
                      <span className="pill-row">
                        <span className="pill">
                          {item.status === "healthy"
                            ? t(messages, "farmSettings.expectationsHealthy", "Current")
                            : t(messages, "farmSettings.expectationsAttention", "Needs attention")}
                        </span>
                        {item.latest_record_id ? (
                          <Link className="button-secondary" href={`/records/${item.latest_record_id}`}>
                            {t(messages, "farmSettings.expectationsOpenRecord", "Open record")}
                          </Link>
                        ) : item.existing_alert_id ? (
                          <Link className="button-secondary" href={`/alerts/${item.existing_alert_id}`}>
                            {t(messages, "farmSettings.expectationsOpenAlert", "Open alert")}
                          </Link>
                        ) : (
                          <>
                            <Link className="button-secondary" href={`/records/new?farmId=${encodeURIComponent(farmId)}&templateId=${encodeURIComponent(item.template_id)}`}>
                              {t(messages, "farmSettings.expectationsCreateRecord", "Create record")}
                            </Link>
                            <form action={createMissingRecordAlertAction}>
                              <input type="hidden" name="farm_id" value={farmId} />
                              <input type="hidden" name="template_id" value={item.template_id} />
                              <input type="hidden" name="template_code" value={item.template_code} />
                              <input type="hidden" name="template_name" value={item.template_name} />
                              <SubmitButton className="button-secondary" pendingLabel={t(messages, "farmSettings.expectationsCreateAlertPending", "Creating alert...")}>
                                {t(messages, "farmSettings.expectationsCreateAlert", "Create alert")}
                              </SubmitButton>
                            </form>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noExpectations", "No template expectation checks are available yet.")}</EmptyPanel>}
            </Panel>

            <Panel
              id="farm-devices-panel"
              eyebrow={t(messages, "farmSettings.devicesEyebrow", "Device activity")}
              title={t(messages, "farmSettings.devicesTitle", "Devices")}
              body={t(messages, "farmSettings.devicesBody", "Jump into device detail when a farm issue clearly traces back to one unit.")}
            >
              {settings.summary.devices.length ? (
                <ul className="status-list">
                  {settings.summary.devices.map((device) => {
                    const status = Array.isArray(device.device_status) ? device.device_status[0] ?? null : device.device_status ?? null;

                    return (
                      <li className="mobile-list-row" key={device.id}>
                        <span>
                          <Link href={`/devices/${device.device_id}`}>{device.serial_number ?? device.device_id}</Link>
                          <span className="list-meta">{status?.online_state ?? "unknown"} Â· {formatDate(status?.last_seen_at)}</span>
                        </span>
                        <span className="pill-row">
                          <span className="pill">{status?.battery_percent ?? "N/A"}%</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noDevicesSummary", "No devices are currently assigned to this farm.")}</EmptyPanel>}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.accessEyebrow", "Team access")}
              title={t(messages, "farmSettings.members")}
              body={t(messages, "farmSettings.membersBody", "People who can view or operate this farm.")}
            >
              {settings.members.length ? (
                <ul className="farm-access-list">
                  {settings.members.map((member) => (
                    <li key={member.id}>
                      <div>
                        <strong>{member.email}</strong>
                        <span className="muted">{member.role}</span>
                      </div>
                      <span className="pill-row"><PermissionPills item={member} messages={messages} /></span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noMembers")}</EmptyPanel>}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.partnerEyebrow", "Partner access")}
              title={t(messages, "farmSettings.resellers")}
              body={t(messages, "farmSettings.resellersBody", "External support access stays scoped and auditable.")}
            >
              {settings.resellers.length ? (
                <ul className="farm-access-list">
                  {settings.resellers.map((assignment) => (
                    <li key={assignment.id}>
                      <div>
                        <strong>{assignment.email}</strong>
                        <span className="muted">{assignment.reseller_user_id}</span>
                      </div>
                      <span className="pill-row"><PermissionPills item={assignment} messages={messages} /></span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noResellers")}</EmptyPanel>}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.auditEyebrow", "Audit")}
              title={t(messages, "farmSettings.audit")}
              body={t(messages, "farmSettings.auditBody", "Recent changes that affect this farm.")}
            >
              {settings.audit.length ? (
                <ul className="farm-audit-list">
                  {settings.audit.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.action}</span>
                      <time>{new Date(entry.created_at).toLocaleDateString("en-CA")}</time>
                    </li>
                  ))}
                </ul>
              ) : <EmptyPanel>{t(messages, "farmSettings.noAudit")}</EmptyPanel>}
            </Panel>
          </div>

          <aside className="farm-settings-side">
            <Panel
              eyebrow={t(messages, "farmSettings.inviteEyebrow", "Invite")}
              title={t(messages, "farmSettings.inviteMember")}
              body={t(messages, "farmSettings.inviteBody", "Invite by email and choose only the access they need.")}
            >
              <form className="form" action={createMemberInvite}>
                <input type="hidden" name="farm_id" value={farmId} />
                <label>
                  {t(messages, "auth.email")}
                  <input name="email" type="email" required />
                </label>
                <div className="permission-grid">
                  {MEMBER_PERMISSIONS.map(([name, key, fallback], index) => (
                    <CheckRow key={name} name={name} label={t(messages, key, fallback)} defaultChecked={index === 0} />
                  ))}
                </div>
                <SubmitButton>{t(messages, "farmSettings.createInvite")}</SubmitButton>
              </form>
              {inviteToken ? (
                <p className="notice invite-token">
                  <strong>{t(messages, "inviteAccept.created")}</strong>
                  <br />
                  <span>{inviteAcceptPath(inviteToken)}</span>
                  <br />
                  <Link href={inviteAcceptPath(inviteToken)}>{t(messages, "inviteAccept.acceptLink")}</Link>
                </p>
              ) : null}
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.resellerEyebrow", "Reseller")}
              title={t(messages, "farmSettings.assignReseller")}
              body={t(messages, "farmSettings.assignResellerBody", "Grant support permissions to a known reseller user ID.")}
            >
              <form className="form" action={assignReseller}>
                <input type="hidden" name="farm_id" value={farmId} />
                <label>
                  {t(messages, "farmSettings.resellerUserId")}
                  <input name="reseller_user_id" required placeholder="00000000-0000-0000-0000-000000000000" />
                </label>
                <div className="permission-grid">
                  {RESELLER_PERMISSIONS.map(([name, key, fallback]) => (
                    <CheckRow key={name} name={name} label={t(messages, key, fallback)} />
                  ))}
                </div>
                <SubmitButton>{t(messages, "farmSettings.assignResellerAction")}</SubmitButton>
              </form>
            </Panel>

            <Panel
              eyebrow={t(messages, "farmSettings.notificationEyebrow", "Notifications")}
              title={t(messages, "farmSettings.notificationPreferences")}
              body={t(messages, "farmSettings.notificationBody", "Choose where and when you personally receive alerts.")}
            >
              <form className="form" action={updateFarmContactsAction}>
                <input type="hidden" name="farm_id" value={farmId} />
                {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
                <label>
                  {t(messages, "farmSettings.deliveryFarmEmailField", "Farm fallback email")}
                  <input
                    defaultValue={settings.farm.alert_email_to ?? ""}
                    name="alert_email_to"
                    placeholder="alerts@example.com"
                    type="email"
                  />
                </label>
                <label>
                  {t(messages, "farmSettings.deliveryFarmLineField", "Farm fallback LINE")}
                  <input
                    defaultValue={settings.farm.alert_line_user_id ?? ""}
                    name="alert_line_user_id"
                    placeholder="Uxxxxxxxxxxxxxxxx"
                  />
                </label>
                <SubmitButton>{t(messages, "farmSettings.saveDeliveryContacts", "Save delivery contacts")}</SubmitButton>
              </form>
              <form className="form" action={updateOwnNotificationPreference}>
                <input type="hidden" name="farm_id" value={farmId} />
                {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
                <div className="settings-fieldset">
                  <span>{t(messages, "farmSettings.notificationChannels", "Channels")}</span>
                  <div className="permission-grid">
                    <CheckRow name="email_enabled" label={t(messages, "farmSettings.emailChannel", "Email")} defaultChecked />
                    <CheckRow name="line_enabled" label={t(messages, "farmSettings.lineChannel", "LINE")} />
                    <CheckRow name="critical_only" label={t(messages, "farmSettings.criticalOnly")} />
                  </div>
                </div>
                <div className="settings-fieldset">
                  <span>{t(messages, "farmSettings.alertTypeGroup", "Alert types")}</span>
                  <div className="permission-grid">
                    {ALERT_TYPES.map(([alertType, key, fallback]) => (
                      <CheckRow key={alertType} name={`alert_${alertType}`} label={t(messages, key, fallback)} defaultChecked />
                    ))}
                  </div>
                </div>
                <SubmitButton>{t(messages, "farmSettings.savePreference")}</SubmitButton>
              </form>
            </Panel>
          </aside>
        </section>
      ) : null}
    </AppShell>
  );
}
