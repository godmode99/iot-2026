import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { DeviceAlertActions } from "@/components/device-alert-actions.jsx";
import { DeviceCommandForm } from "@/components/device-command-form.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadDeviceDetail } from "@/lib/data/device-detail.js";
import { submitAlertAction, submitDeviceCommand } from "./actions.js";

export const dynamic = "force-dynamic";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return `${value}${suffix}`;
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

function batteryLabel(status) {
  if (!status?.battery_percent && status?.battery_percent !== 0) {
    return "battery N/A";
  }

  return `${Number(status.battery_percent).toFixed(0)}% battery`;
}

function MiniHistory({ history }) {
  if (!history.length) {
    return <p className="muted">No telemetry history yet.</p>;
  }

  return (
    <div className="history-strip" aria-label="Recent temperature history">
      {history.map((row) => (
        <span
          className="history-dot"
          key={row.id}
          title={`${formatDate(row.recorded_at)}: ${formatValue(row.temperature_c, " C")}`}
          style={{ "--level": `${Math.max(10, Math.min(100, Number(row.temperature_c ?? 0) * 2.5))}%` }}
        />
      ))}
    </div>
  );
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

export default async function DeviceDetailPage({ params, searchParams }) {
  const messages = await getMessages();
  const { deviceId } = await params;
  const query = await searchParams;
  const { authConfigured, user } = await requireUser({ returnUrl: `/devices/${deviceId}` });
  const detail = user ? await loadDeviceDetail({ deviceId }) : null;
  const device = detail?.device ?? null;
  const status = detail?.status ?? null;
  const feedback = ["command", "alert", "error"]
    .map((key) => (typeof query?.[key] === "string" ? `${key}: ${query[key]}` : null))
    .filter(Boolean);
  const canSendAnyCommand = detail?.permissions.canSendSafeCommand || detail?.permissions.canSendOtaApply;
  const safeCommands = ["reboot", "config_refresh", "ota_check", "telemetry_flush"];
  const commandOptions = detail?.permissions.canSendOtaApply ? [...safeCommands, "ota_apply"] : safeCommands;
  const latestTelemetry = detail?.history.at(-1) ?? null;
  const openAlerts = detail?.alerts.filter((alert) => alert.status === "open") ?? [];
  const criticalAlerts = openAlerts.filter((alert) => alert.severity === "critical");

  return (
    <AppShell currentPath={`/devices/${deviceId}`} ariaLabel="Device detail navigation">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {feedback.length ? <section className="notice">{feedback.join(" / ")}</section> : null}

      <section className="device-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "deviceDetail.eyebrow")}</p>
          <h1 className="page-title">{device?.serial_number ?? deviceId}</h1>
          <p className="lede">
            {device ? t(messages, "deviceDetail.body") : t(messages, "deviceDetail.notFoundBody")}
          </p>
          <div className="inline-actions">
            {device?.farms ? (
              <Link className="pill" href={`/farms/${device.farm_id}`}>{device.farms.name}</Link>
            ) : null}
            {device ? <span className={`pill ${statusClass(status?.online_state)}`}>{label(status?.online_state)}</span> : null}
            {criticalAlerts.length ? (
              <span className="pill is-offline">{criticalAlerts.length} {t(messages, "deviceDetail.criticalAlerts")}</span>
            ) : null}
          </div>
        </div>

        {device ? (
          <div className="device-hero-panel">
            <span className="muted">{t(messages, "deviceDetail.lastSeen")}</span>
            <strong>{formatDate(status?.last_seen_at)}</strong>
            <div className="device-health-strip">
              <span className="health-chip">{batteryLabel(status)}</span>
              <span className="health-chip">{t(messages, "deviceDetail.signal")}: {formatValue(status?.signal_quality, "%")}</span>
              <span className="health-chip">{t(messages, "deviceDetail.firmware")}: {formatValue(device.firmware_version)}</span>
              <span className="health-chip">{t(messages, "deviceDetail.interval")}: {device.publish_interval_sec}s</span>
            </div>
          </div>
        ) : null}
      </section>

      {detail?.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {detail.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      {device ? (
        <>
          <section className="metric-grid dashboard-metrics">
            <Metric labelText={t(messages, "deviceDetail.onlineState")} value={label(status?.online_state)} meta={formatDate(status?.last_seen_at)} />
            <Metric labelText={t(messages, "deviceDetail.battery")} value={formatValue(status?.battery_percent, "%")} meta={formatValue(status?.battery_mv, " mV")} />
            <Metric labelText={t(messages, "deviceDetail.signal")} value={formatValue(status?.signal_quality, "%")} meta={label(status?.gps_fix_state)} />
            <Metric labelText={t(messages, "deviceDetail.variant")} value={label(device.battery_variant)} meta={`${device.publish_interval_sec}s`} />
          </section>

          <section className="dashboard-grid">
            <article className="card">
              <h2>{t(messages, "deviceDetail.latestTelemetry")}</h2>
              <div className="metric-grid compact-grid">
                <Metric labelText={t(messages, "deviceDetail.temperature")} value={formatValue(latestTelemetry?.temperature_c, " C")} />
                <Metric labelText={t(messages, "deviceDetail.turbidity")} value={formatValue(latestTelemetry?.turbidity_raw)} />
                <Metric labelText="GPS" value={status?.last_lat && status?.last_lng ? `${Number(status.last_lat).toFixed(5)}, ${Number(status.last_lng).toFixed(5)}` : "N/A"} />
              </div>
              <MiniHistory history={detail.history} />
            </article>

            <article className="card">
              <h2>{t(messages, "deviceDetail.commands")}</h2>
              {canSendAnyCommand ? (
                <DeviceCommandForm
                  action={submitDeviceCommand}
                  commandOptions={commandOptions}
                  deviceId={deviceId}
                  labels={{
                    commandType: t(messages, "deviceDetail.commandType"),
                    commandNote: t(messages, "deviceDetail.commandNote"),
                    queueCommand: t(messages, "deviceDetail.queueCommand"),
                    riskNotice: t(messages, "deviceDetail.riskNotice"),
                    confirmEyebrow: t(messages, "deviceDetail.confirmEyebrow"),
                    confirmTitle: t(messages, "deviceDetail.confirmTitle"),
                    confirmBody: t(messages, "deviceDetail.confirmBody"),
                    confirmAction: t(messages, "deviceDetail.confirmAction"),
                    cancelAction: t(messages, "deviceDetail.cancelAction")
                  }}
                />
              ) : <p className="muted">{t(messages, "deviceDetail.commandViewOnly")}</p>}
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="card">
              <h2>{t(messages, "deviceDetail.alerts")}</h2>
              {detail.alerts.length ? (
                <ul className="status-list">
                  {detail.alerts.map((alert) => (
                    <li key={alert.id} className="stacked-row">
                      <div>
                        <strong>{label(alert.alert_type)}</strong>
                        <span className={`pill ${statusClass(alert.severity)}`}>{alert.severity}</span>
                        <span className="muted">{formatDate(alert.opened_at)}</span>
                      </div>
                      {detail.permissions.canManageAlerts && ["open", "acknowledged"].includes(alert.status) ? (
                        <DeviceAlertActions
                          action={submitAlertAction}
                          actions={["acknowledge", "suppress", "resolve"]}
                          alertId={alert.id}
                          deviceId={deviceId}
                          labels={{
                            actionLabels: {
                              acknowledge: t(messages, "deviceDetail.acknowledgeAction"),
                              suppress: t(messages, "deviceDetail.suppressAction"),
                              resolve: t(messages, "deviceDetail.resolveAction")
                            },
                            confirmEyebrow: t(messages, "deviceDetail.alertConfirmEyebrow"),
                            confirmTitle: t(messages, "deviceDetail.alertConfirmTitle"),
                            confirmBody: t(messages, "deviceDetail.alertConfirmBody"),
                            confirmAction: t(messages, "deviceDetail.alertConfirmAction"),
                            cancelAction: t(messages, "deviceDetail.cancelAction")
                          }}
                        />
                      ) : <span className="pill">{alert.status}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "deviceDetail.noAlerts")}</p>}
            </article>

            <article className="card">
              <h2>{t(messages, "deviceDetail.commandLog")}</h2>
              {detail.commands.length ? (
                <ul className="status-list">
                  {detail.commands.map((command) => (
                    <li key={command.id}>
                      <span>{label(command.command_type)}</span>
                      <span className={`pill ${statusClass(command.status)}`}>{command.status}</span>
                      <span className="muted">{formatDate(command.requested_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "deviceDetail.noCommands")}</p>}
            </article>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
