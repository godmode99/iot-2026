import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { DeviceAlertActions } from "@/components/device-alert-actions.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadCustomerAlertDetail } from "@/lib/data/customer-alerts.js";
import { getMessages, t } from "@/lib/i18n.js";
import { submitCustomerAlertAction } from "./actions.js";

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
  if (value === "resolved") {
    return "is-online";
  }

  if (value === "critical") {
    return "is-offline";
  }

  return "is-stale";
}

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function sourceLabel(value, messages) {
  if (value === "record_detail") {
    return t(messages, "alertDetailPage.sources.record", "Record-driven");
  }

  if (value === "device_telemetry") {
    return t(messages, "alertDetailPage.sources.telemetry", "Telemetry-driven");
  }

  if (value === "record_expectation") {
    return t(messages, "alertDetailPage.sources.expectation", "Expectation-driven");
  }

  return t(messages, "alertDetailPage.sources.system", "System");
}

function formatEntryValue(entry) {
  if (entry.value_number !== null && entry.value_number !== undefined) {
    return `${entry.value_number}${entry.unit ? ` ${entry.unit}` : ""}`;
  }

  if (entry.value_boolean === true) {
    return "Completed";
  }

  if (entry.value_boolean === false) {
    return "No";
  }

  if (entry.value_text) {
    return entry.value_text;
  }

  return "N/A";
}

function preferenceTypeLabel(value, messages) {
  if (value === "low_battery") {
    return t(messages, "alertDetailPage.deliveryTypes.lowBattery", "Low battery");
  }

  if (value === "sensor_fault") {
    return t(messages, "alertDetailPage.deliveryTypes.sensorFault", "Sensor fault");
  }

  if (value === "offline") {
    return t(messages, "alertDetailPage.deliveryTypes.offline", "Offline");
  }

  return t(messages, "alertDetailPage.deliveryTypes.threshold", "Threshold");
}

function timelineLabel(value, messages) {
  if (value === "opened") {
    return t(messages, "alertDetailPage.timelineOpened", "Opened");
  }

  if (value === "acknowledge") {
    return t(messages, "alertDetailPage.timelineAcknowledged", "Acknowledged");
  }

  if (value === "suppress") {
    return t(messages, "alertDetailPage.timelineSuppressed", "Suppressed");
  }

  if (value === "resolve") {
    return t(messages, "alertDetailPage.timelineResolved", "Resolved");
  }

  return t(messages, "alertDetailPage.timelineUpdated", "Updated");
}

function dispatchAuditMeta(value, messages) {
  if (value === "coverage-missing") {
    return {
      label: t(messages, "alertDetailPage.dispatchStates.coverageMissing", "Coverage missing"),
      className: "is-offline"
    };
  }

  if (value === "follow-up-first") {
    return {
      label: t(messages, "alertDetailPage.dispatchStates.followUpFirst", "Follow-up first"),
      className: "is-stale"
    };
  }

  return {
    label: t(messages, "alertDetailPage.dispatchStates.ready", "Ready to review"),
    className: "is-online"
  };
}

export default async function AlertDetailPage({ params, searchParams }) {
  const messages = await getMessages();
  const { alertId } = await params;
  const query = await searchParams;
  const returnTo = typeof query?.return_to === "string" ? query.return_to : "";

  await requireUser({ returnUrl: `/alerts/${alertId}` });
  const detail = await loadCustomerAlertDetail({ alertId });
  const feedback = ["alert", "error"]
    .map((key) => (typeof query?.[key] === "string" ? `${key}: ${query[key]}` : null))
    .filter(Boolean);

  return (
    <AppShell currentPath="/alerts" ariaLabel="Alert detail navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "alertDetailPage.eyebrow", "Alert detail")}</p>
          <h1 className="page-title">
            {detail.alert ? label(detail.alert.alert_type) : t(messages, "alertDetailPage.missingTitle", "Alert unavailable")}
          </h1>
          <p className="lede">
            {detail.alert
              ? t(messages, "alertDetailPage.body", "Review the current severity, linked farm and device, and decide whether this alert should be acknowledged, suppressed, or resolved.")
              : t(messages, "alertDetailPage.missingBody", "This alert is not visible in the current workspace.")}
          </p>
        </div>
        {detail.alert ? (
          <div className="inline-actions">
            <Link className="button-secondary" href={returnTo || "/alerts"}>{returnTo ? t(messages, "alertDetailPage.backToReportAction", "Back to report") : t(messages, "alertDetailPage.backAction", "Back to alerts")}</Link>
            {detail.device?.device_id ? <Link className="button" href={`/devices/${detail.device.device_id}`}>{t(messages, "alertDetailPage.deviceAction", "View device")}</Link> : null}
          </div>
        ) : null}
      </section>

      {feedback.length ? <section className="notice">{feedback.join(" / ")}</section> : null}

      {detail.errors.length ? (
        <section className="notice">
          <strong>{t(messages, "alertsPage.dataWarnings", "Alert data warnings")}</strong>
          <ul>
            {detail.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      {detail.alert ? (
        <section className="dashboard-grid">
          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "alertDetailPage.summaryEyebrow", "Alert summary")}</p>
                <h2>{t(messages, "alertDetailPage.summaryTitle", "Current alert state")}</h2>
              </div>
              <span className={`pill ${statusClass(detail.alert.severity)}`}>{detail.alert.severity}</span>
            </div>
            <div className="records-field-group-grid">
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.cards.status", "Status")}</h3>
                <p>{detail.alert.status}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.cards.farm", "Farm")}</h3>
                <p>{detail.farm?.name ?? "N/A"}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.cards.device", "Device")}</h3>
                <p>{detail.device?.serial_number ?? detail.device?.device_id ?? "N/A"}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.cards.opened", "Opened at")}</h3>
                <p>{formatDate(detail.alert.opened_at)}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.cards.source", "Source")}</h3>
                <p>{sourceLabel(detail.alert.source, messages)}</p>
              </article>
            </div>
            <article className="record-summary-card">
              <span className="eyebrow">{t(messages, "alertDetailPage.detailsEyebrow", "Details payload")}</span>
              <p>{detail.alert.details_json ? JSON.stringify(detail.alert.details_json, null, 2) : t(messages, "alertDetailPage.detailsFallback", "No extra details were attached to this alert.")}</p>
            </article>
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "alertDetailPage.actionsEyebrow", "Alert actions")}</p>
                <h2>{t(messages, "alertDetailPage.actionsTitle", "Manage this alert")}</h2>
              </div>
            </div>
            {detail.permissions.canManageAlerts && ["open", "acknowledged"].includes(detail.alert.status) ? (
              <DeviceAlertActions
                action={submitCustomerAlertAction}
                actions={["acknowledge", "suppress", "resolve"]}
                alertId={detail.alert.id}
                deviceId={detail.device?.device_id ?? ""}
                hiddenValues={returnTo ? { return_to: returnTo } : undefined}
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
            ) : (
              <p className="muted">{t(messages, "alertDetailPage.readOnlyBody", "This alert is already in a final state or the current account cannot manage alert actions.")}</p>
            )}
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "alertDetailPage.deliveryEyebrow", "Delivery preview")}</p>
                <h2>{t(messages, "alertDetailPage.deliveryTitle", "Who should receive this alert")}</h2>
              </div>
            </div>
            <p className="muted">{t(messages, "alertDetailPage.deliveryAuditBody", "This preview reflects the current farm contacts and notification preferences, so delivery can be audited before real sending is wired in.")}</p>
            <div className="notice">
              <strong>{t(messages, "alertDetailPage.dispatchAuditTitle", "Dispatch audit")}</strong>
              <span className={`pill ${dispatchAuditMeta(detail.notificationDispatchAudit.state, messages).className}`}>{dispatchAuditMeta(detail.notificationDispatchAudit.state, messages).label}</span>
              <span> {detail.notificationDispatchAudit.reason}</span>
              <span className="list-meta">{detail.notificationDispatchAudit.recommendedAction}</span>
            </div>
            <div className="records-field-group-grid">
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.deliveryCards.type", "Preference type")}</h3>
                <p>{preferenceTypeLabel(detail.notificationPreview.preferenceType, messages)}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.deliveryCards.recipients", "Personal recipients")}</h3>
                <p>{detail.notificationPreview.personalRecipientCount}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.deliveryCards.email", "Email")}</h3>
                <p>{detail.notificationPreview.emailRecipientCount}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "alertDetailPage.deliveryCards.line", "LINE")}</h3>
                <p>{detail.notificationPreview.lineRecipientCount}</p>
              </article>
            </div>
            <div className="record-meta-list">
              <span className={`pill ${detail.notificationPreview.farmEmailConfigured ? "is-online" : "is-stale"}`}>
                {detail.notificationPreview.farmEmailConfigured
                  ? t(messages, "alertDetailPage.deliveryFarmEmailReady", "Farm email ready")
                  : t(messages, "alertDetailPage.deliveryFarmEmailMissing", "Farm email missing")}
              </span>
              <span className={`pill ${detail.notificationPreview.farmLineConfigured ? "is-online" : "is-stale"}`}>
                {detail.notificationPreview.farmLineConfigured
                  ? t(messages, "alertDetailPage.deliveryFarmLineReady", "Farm LINE ready")
                  : t(messages, "alertDetailPage.deliveryFarmLineMissing", "Farm LINE missing")}
              </span>
            </div>
            {detail.notificationPreview.recipients.length ? (
              <ul className="status-list">
                {detail.notificationPreview.recipients.map((recipient) => (
                  <li className="mobile-list-row" key={recipient.user_id}>
                    <span>
                      <strong>{recipient.display_name || recipient.user_id}</strong>
                      <span className="list-meta">{recipient.role}</span>
                    </span>
                    <span className="pill-row">
                      {recipient.email_enabled ? <span className="pill">{t(messages, "farmSettings.emailChannel", "Email")}</span> : null}
                      {recipient.line_enabled ? <span className="pill">{t(messages, "farmSettings.lineChannel", "LINE")}</span> : null}
                      {recipient.critical_only ? <span className="pill">{t(messages, "alertDetailPage.deliveryCriticalOnly", "Critical only")}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "alertDetailPage.deliveryEmptyEyebrow", "No recipients")}</p>
                  <h2>{t(messages, "alertDetailPage.deliveryEmptyTitle", "No personal recipients currently match this alert")}</h2>
                  <p className="muted">{t(messages, "alertDetailPage.deliveryEmptyBody", "Review farm contacts and notification preferences if this alert should notify more people.")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "alertDetailPage.timelineEyebrow", "Alert timeline")}</p>
                <h2>{t(messages, "alertDetailPage.timelineTitle", "What happened to this alert so far")}</h2>
              </div>
            </div>
            {detail.alertTimeline.length ? (
              <ul className="status-list">
                {detail.alertTimeline.map((event) => (
                  <li className="mobile-list-row" key={event.key}>
                    <span>
                      <strong>{timelineLabel(event.type, messages)}</strong>
                      <span className="list-meta">{event.body}</span>
                    </span>
                    <span className="pill-row">
                      <span className="pill">{formatDate(event.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "alertDetailPage.timelineEmptyEyebrow", "No timeline yet")}</p>
                  <h2>{t(messages, "alertDetailPage.timelineEmptyTitle", "No timeline entries are available yet")}</h2>
                  <p className="muted">{t(messages, "alertDetailPage.timelineEmptyBody", "Timeline entries will appear here as this alert is opened and worked through by the team.")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "alertDetailPage.sourceEyebrow", "Source context")}</p>
                <h2>{t(messages, "alertDetailPage.sourceTitle", "What triggered this alert")}</h2>
              </div>
            </div>
            {detail.sourceRecord ? (
              <>
                <div className="records-field-group-grid">
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.sourceCards.template", "Record template")}</h3>
                    <p>{detail.sourceRecord.record_templates?.name ?? "Operational record"}</p>
                  </article>
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.sourceCards.recordedFor", "Recorded for")}</h3>
                    <p>{formatDate(detail.sourceRecord.recorded_for_date ?? detail.sourceRecord.created_at)}</p>
                  </article>
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.sourceCards.recordedBy", "Recorded by")}</h3>
                    <p>{detail.sourceRecord.user_profiles?.display_name ?? "Unknown"}</p>
                  </article>
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.sourceCards.status", "Record status")}</h3>
                    <p>{detail.sourceRecord.record_status ?? "submitted"}</p>
                  </article>
                </div>
                <article className="record-summary-card">
                  <span className="eyebrow">{t(messages, "alertDetailPage.sourceNoteEyebrow", "Source summary")}</span>
                  <p>{detail.sourceRecord.notes_summary ?? t(messages, "alertDetailPage.sourceNoteFallback", "No summary note was attached to the source record.")}</p>
                </article>
                {detail.sourceRecord.record_entries?.length ? (
                  <div className="records-template-grid">
                    {detail.sourceRecord.record_entries.map((entry) => (
                      <article className="records-field-card" key={entry.id}>
                        <span>{entry.label}</span>
                        <strong>{formatEntryValue(entry)}</strong>
                        <span className="muted">{entry.field_key}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="action-row">
                  <Link className="button-secondary" href={returnTo ? `/records/${detail.sourceRecord.id}?return_to=${encodeURIComponent(returnTo)}` : `/records/${detail.sourceRecord.id}`}>
                    {t(messages, "alertDetailPage.sourceAction", "Open source record")}
                  </Link>
                </div>
              </>
            ) : detail.sourceExpectation ? (
              <>
                <div className="records-field-group-grid">
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.expectationCards.template", "Expected template")}</h3>
                    <p>{detail.sourceExpectation.templateName ?? detail.sourceExpectation.templateCode ?? "N/A"}</p>
                  </article>
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.expectationCards.window", "Expected window")}</h3>
                    <p>
                      {detail.sourceExpectation.expectedWindowDays
                        ? `${detail.sourceExpectation.expectedWindowDays} ${t(messages, "alertDetailPage.expectationCards.days", "days")}`
                        : t(messages, "alertDetailPage.expectationCards.unspecified", "Not specified")}
                    </p>
                  </article>
                  <article className="records-field-group-card">
                    <h3>{t(messages, "alertDetailPage.expectationCards.type", "Expectation type")}</h3>
                    <p>{t(messages, "alertDetailPage.sources.expectation", "Expectation-driven")}</p>
                  </article>
                </div>
                <article className="record-summary-card">
                  <span className="eyebrow">{t(messages, "alertDetailPage.expectationNoteEyebrow", "Expectation summary")}</span>
                  <p>{detail.sourceExpectation.note ?? t(messages, "alertDetailPage.expectationNoteFallback", "A recent record is expected for this template, but no fresh record was found in the configured window.")}</p>
                </article>
                <div className="action-row">
                  <Link className="button-secondary" href={returnTo ? `/records/new?return_to=${encodeURIComponent(returnTo)}` : `/records/new`}>
                    {t(messages, "alertDetailPage.expectationAction", "Create record")}
                  </Link>
                </div>
              </>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "alertDetailPage.sourceEmptyEyebrow", "No source record")}</p>
                  <h2>{t(messages, "alertDetailPage.sourceEmptyTitle", "This alert was not created from an operational record")}</h2>
                  <p className="muted">{t(messages, "alertDetailPage.sourceEmptyBody", "Telemetry, expectation checks, device logic, or other workflows can still create alerts without a record as the source.")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "alertDetailPage.recordsEyebrow", "Related records")}</p>
                <h2>{t(messages, "alertDetailPage.recordsTitle", "Recent operational records for this farm")}</h2>
              </div>
            </div>
            {detail.relatedRecords.length ? (
              <ul className="status-list">
                {detail.relatedRecords.map((record) => (
                  <li className="mobile-list-row" key={record.id}>
                    <span>
                      <Link href={returnTo ? `/records/${record.id}?return_to=${encodeURIComponent(returnTo)}` : `/records/${record.id}`}>{record.record_templates?.name ?? "Operational record"}</Link>
                      <span className="list-meta">
                        {formatDate(record.recorded_for_date ?? record.created_at)} · {record.user_profiles?.display_name ?? "Unknown"}
                      </span>
                      {record.notes_summary ? <span className="list-meta">{record.notes_summary}</span> : null}
                    </span>
                    <span className="pill">{record.record_status ?? "submitted"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "alertDetailPage.recordsEmptyEyebrow", "No related records")}</p>
                  <h2>{t(messages, "alertDetailPage.recordsEmptyTitle", "No operational records are linked to this farm yet")}</h2>
                  <p className="muted">{t(messages, "alertDetailPage.recordsEmptyBody", "Create structured records to add more on-the-ground context when alerts open.")}</p>
                </div>
                <div className="action-row">
                  <Link className="button" href={returnTo ? `/records/new?return_to=${encodeURIComponent(returnTo)}` : `/records/new`}>{t(messages, "alertDetailPage.recordsAction", "Create record")}</Link>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="empty-panel dashboard-card">
          <div>
            <p className="eyebrow">{t(messages, "alertDetailPage.missingEyebrow", "Alert unavailable")}</p>
            <h2>{t(messages, "alertDetailPage.missingTitle", "Alert unavailable")}</h2>
            <p className="muted">{t(messages, "alertDetailPage.missingBody", "This alert is not visible in the current workspace.")}</p>
          </div>
          <div className="action-row">
            <Link className="button" href={returnTo || "/alerts"}>{returnTo ? t(messages, "alertDetailPage.backToReportAction", "Back to report") : t(messages, "alertDetailPage.backAction", "Back to alerts")}</Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
