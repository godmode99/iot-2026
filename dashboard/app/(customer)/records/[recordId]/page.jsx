import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOperationalRecordDetail } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";

export const dynamic = "force-dynamic";

const FIELD_THRESHOLDS = {
  water_temperature_c: {
    warning: { min: 26, max: 30 },
    critical: { min: 24, max: 32 }
  },
  salinity_ppt: {
    warning: { min: 20, max: 30 },
    critical: { min: 15, max: 35 }
  },
  dissolved_oxygen_mg_l: {
    warning: { min: 4.5 },
    critical: { min: 3.5 }
  }
};

function formatDate(value, withTime = false) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function formatEntryValue(entry) {
  if (entry.value_number !== null && entry.value_number !== undefined) {
    return `${entry.value_number}${entry.unit ? ` ${entry.unit}` : ""}`;
  }

  if (entry.value_boolean === true) {
    return "Completed";
  }

  if (entry.value_text) {
    return entry.value_text;
  }

  return "N/A";
}

function evaluateEntry(entry) {
  const threshold = FIELD_THRESHOLDS[entry.field_key];
  if (!threshold || entry.value_number === null || entry.value_number === undefined) {
    return { level: "normal", message: null };
  }

  const value = Number(entry.value_number);
  const critical = threshold.critical ?? {};
  const warning = threshold.warning ?? {};

  if (
    (critical.min !== undefined && value < critical.min) ||
    (critical.max !== undefined && value > critical.max)
  ) {
    return { level: "critical", message: "Outside critical range" };
  }

  if (
    (warning.min !== undefined && value < warning.min) ||
    (warning.max !== undefined && value > warning.max)
  ) {
    return { level: "warning", message: "Outside preferred range" };
  }

  return { level: "normal", message: "Within expected range" };
}

function summarizeEntryHealth(entries) {
  const evaluations = entries.map(evaluateEntry).filter((item) => item.level !== "normal");

  return {
    critical: evaluations.filter((item) => item.level === "critical").length,
    warning: evaluations.filter((item) => item.level === "warning").length
  };
}

function buildFollowUps(entries) {
  const recommendations = [];

  entries.forEach((entry) => {
    const evaluation = evaluateEntry(entry);

    if (entry.field_key === "dissolved_oxygen_mg_l" && evaluation.level === "critical") {
      recommendations.push({
        level: "critical",
        title: "Escalate dissolved oxygen issue",
        body: "Review aeration, water movement, and stock stress immediately. Treat this as an operator alert condition."
      });
      return;
    }

    if (entry.field_key === "dissolved_oxygen_mg_l" && evaluation.level === "warning") {
      recommendations.push({
        level: "warning",
        title: "Recheck dissolved oxygen soon",
        body: "Plan a follow-up reading in the next round and confirm whether aeration or stocking conditions need adjustment."
      });
      return;
    }

    if (entry.field_key === "water_temperature_c" && evaluation.level === "critical") {
      recommendations.push({
        level: "critical",
        title: "Review temperature control immediately",
        body: "Check water source, shading, and circulation before this drifts into a larger hatchery or farm issue."
      });
      return;
    }

    if (entry.field_key === "water_temperature_c" && evaluation.level === "warning") {
      recommendations.push({
        level: "warning",
        title: "Track temperature trend",
        body: "Schedule another reading and compare against the next monitoring round before deciding on intervention."
      });
      return;
    }

    if (entry.field_key === "salinity_ppt" && evaluation.level === "critical") {
      recommendations.push({
        level: "critical",
        title: "Stop and validate salinity inputs",
        body: "Confirm the reading, review mixing or water source assumptions, and treat this as a high-priority operating deviation."
      });
      return;
    }

    if (entry.field_key === "salinity_ppt" && evaluation.level === "warning") {
      recommendations.push({
        level: "warning",
        title: "Plan a salinity correction check",
        body: "Use the next round to verify whether the value is drifting further before moving into corrective action."
      });
    }
  });

  if (!recommendations.length) {
    recommendations.push({
      level: "normal",
      title: "No urgent follow-up suggested",
      body: "The recorded values are currently within expected range. Keep this record as a clean baseline for the next monitoring step."
    });
  }

  return recommendations;
}

function buildAlertCandidates(entries, farmId) {
  const candidates = [];

  entries.forEach((entry) => {
    const evaluation = evaluateEntry(entry);

    if (evaluation.level === "normal") {
      return;
    }

    if (entry.field_key === "dissolved_oxygen_mg_l") {
      candidates.push({
        key: `do-${evaluation.level}`,
        level: evaluation.level,
        alertType: "dissolved_oxygen_threshold",
        title: evaluation.level === "critical" ? "Escalate dissolved oxygen deviation" : "Watch dissolved oxygen trend",
        body:
          evaluation.level === "critical"
            ? "This reading is outside the critical band and should be treated as an active farm alert candidate."
            : "This reading is drifting outside the preferred band and is worth tracking as a warning-level alert candidate.",
        href: `/alerts?farm=${farmId ?? ""}&severity=${evaluation.level === "critical" ? "critical" : "warning"}`
      });
      return;
    }

    if (entry.field_key === "water_temperature_c") {
      candidates.push({
        key: `temp-${evaluation.level}`,
        level: evaluation.level,
        alertType: "water_temperature_threshold",
        title: evaluation.level === "critical" ? "Escalate temperature deviation" : "Track temperature as a warning",
        body:
          evaluation.level === "critical"
            ? "The recorded temperature is outside the critical operating band and should be reviewed like an open incident."
            : "The recorded temperature is outside the preferred band and should be monitored before the next round.",
        href: `/alerts?farm=${farmId ?? ""}&severity=${evaluation.level === "critical" ? "critical" : "warning"}`
      });
      return;
    }

    if (entry.field_key === "salinity_ppt") {
      candidates.push({
        key: `salinity-${evaluation.level}`,
        level: evaluation.level,
        alertType: "salinity_threshold",
        title: evaluation.level === "critical" ? "Escalate salinity deviation" : "Track salinity drift",
        body:
          evaluation.level === "critical"
            ? "This salinity value is outside the critical range and should be checked against mixing and water-source assumptions."
            : "This salinity value is drifting outside the preferred band and may justify a warning-level alert if the next round confirms it.",
        href: `/alerts?farm=${farmId ?? ""}&severity=${evaluation.level === "critical" ? "critical" : "warning"}`
      });
    }
  });

  return candidates;
}

function entryStatusClass(level) {
  if (level === "critical") {
    return "is-offline";
  }

  if (level === "warning") {
    return "is-stale";
  }

  return "is-online";
}

function label(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

export default async function RecordDetailPage({ params, searchParams }) {
  const messages = await getMessages();
  const { recordId } = await params;
  const query = await searchParams;

  await requireUser({ returnUrl: `/records/${recordId}` });
  const detail = await loadOperationalRecordDetail({ recordId });
  const feedback = typeof query?.record === "string" ? query.record : "";
  const healthSummary = summarizeEntryHealth(detail.record?.record_entries ?? []);
  const followUps = buildFollowUps(detail.record?.record_entries ?? []);
  const alertCandidates = buildAlertCandidates(detail.record?.record_entries ?? [], detail.record?.farm_id);

  return (
    <AppShell currentPath="/records" ariaLabel="Operational record navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordDetailPage.eyebrow", "Operational record")}</p>
          <h1 className="page-title">
            {detail.record?.record_templates?.name ?? t(messages, "recordDetailPage.missingTitle", "Record unavailable")}
          </h1>
          <p className="lede">
            {detail.record
              ? t(
                messages,
                "recordDetailPage.body",
                "Review the farm, template, summary, and structured entries captured in this operational record."
              )
              : t(messages, "recordDetailPage.missingBody", "This record is not visible in the current workspace.")}
          </p>
        </div>
        {detail.record ? (
          <div className="inline-actions">
            <Link className="button-secondary" href="/records">{t(messages, "recordDetailPage.backAction", "Back to records")}</Link>
            <Link className="button" href={`/records/${recordId}/edit`}>{t(messages, "recordDetailPage.editAction", "Edit record")}</Link>
          </div>
        ) : null}
      </section>

      {feedback ? (
        <section className="notice">
          <strong>{t(messages, "recordDetailPage.noticeTitle", "Record status")}</strong>
          <span> {feedback}</span>
        </section>
      ) : null}

      {detail.errors.length ? (
        <section className="notice">
          <strong>{t(messages, "recordsPage.dataWarnings", "Records data warnings")}</strong>
          <ul>
            {detail.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      {detail.record ? (
        <section className="dashboard-grid">
          <div className="card record-detail-shell">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "recordDetailPage.summaryEyebrow", "Record summary")}</p>
                <h2>{t(messages, "recordDetailPage.summaryTitle", "What was captured")}</h2>
              </div>
              <span className="pill">{detail.record.record_status ?? "submitted"}</span>
            </div>

            <div className="records-field-group-grid">
              <article className="records-field-group-card">
                <h3>{t(messages, "recordDetailPage.summaryCards.farm", "Farm")}</h3>
                <p>{detail.record.farms?.name ?? "N/A"}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "recordDetailPage.summaryCards.date", "Recorded for")}</h3>
                <p>{formatDate(detail.record.recorded_for_date)}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "recordDetailPage.summaryCards.author", "Recorded by")}</h3>
                <p>{detail.record.user_profiles?.display_name ?? "Unknown"}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "recordDetailPage.summaryCards.monitoring", "Monitoring flags")}</h3>
                <p>
                  {healthSummary.critical
                    ? `${healthSummary.critical} critical`
                    : healthSummary.warning
                      ? `${healthSummary.warning} warning`
                      : t(messages, "recordDetailPage.health.ok", "All checked values are within expected range")}
                </p>
              </article>
            </div>

            <article className="record-summary-card">
              <span className="eyebrow">{t(messages, "recordDetailPage.noteEyebrow", "Summary note")}</span>
              <p>{detail.record.notes_summary ?? t(messages, "recordDetailPage.noteFallback", "No summary note was added.")}</p>
            </article>

            <div className="record-meta-list">
              <span>{t(messages, "recordDetailPage.meta.template", "Template")}: {detail.record.record_templates?.code ?? "N/A"}</span>
              <span>{t(messages, "recordDetailPage.meta.created", "Created")}: {formatDate(detail.record.created_at, true)}</span>
              <span>{t(messages, "recordDetailPage.meta.updated", "Updated")}: {formatDate(detail.record.updated_at, true)}</span>
            </div>
          </div>

          <div className="card">
              <div className="split-heading">
                <div>
                  <p className="eyebrow">{t(messages, "recordDetailPage.entriesEyebrow", "Structured fields")}</p>
                  <h2>{t(messages, "recordDetailPage.entriesTitle", "Recorded values")}</h2>
                </div>
                <div className="inline-actions">
                  <span className={`pill ${entryStatusClass(healthSummary.critical ? "critical" : healthSummary.warning ? "warning" : "normal")}`}>
                    {healthSummary.critical
                      ? t(messages, "recordDetailPage.health.critical", "Critical values found")
                      : healthSummary.warning
                        ? t(messages, "recordDetailPage.health.warning", "Warning values found")
                        : t(messages, "recordDetailPage.health.okShort", "Within range")}
                  </span>
                </div>
              </div>

            {detail.record.record_entries.length ? (
              <div className="records-template-grid">
                {detail.record.record_entries.map((entry) => {
                  const evaluation = evaluateEntry(entry);

                  return (
                    <article className="records-field-card" key={entry.id}>
                      <span>{entry.label}</span>
                      <strong>{formatEntryValue(entry)}</strong>
                      <span className="muted">{entry.field_key}</span>
                      {evaluation.message ? (
                        <span className={`pill ${entryStatusClass(evaluation.level)}`}>{evaluation.message}</span>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "recordDetailPage.entriesEmptyEyebrow", "No entry values yet")}</p>
                  <h2>{t(messages, "recordDetailPage.entriesEmptyTitle", "Add structured values to make this record more useful")}</h2>
                  <p className="muted">{t(messages, "recordDetailPage.entriesEmptyBody", "Open the edit flow and add measurements, checklist status, or field notes.")}</p>
                </div>
                <div className="action-row">
                  <Link className="button" href={`/records/${recordId}/edit`}>{t(messages, "recordDetailPage.editAction", "Edit record")}</Link>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "recordDetailPage.followUpEyebrow", "Suggested follow-up")}</p>
                <h2>{t(messages, "recordDetailPage.followUpTitle", "What the team should do next")}</h2>
              </div>
            </div>
            <div className="records-template-grid">
              {followUps.map((item) => (
                <article className="records-field-group-card" key={`${item.level}-${item.title}`}>
                  <span className={`pill ${entryStatusClass(item.level)}`}>{item.level}</span>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "recordDetailPage.alertCandidatesEyebrow", "Suggested alert candidates")}</p>
                <h2>{t(messages, "recordDetailPage.alertCandidatesTitle", "Values that may need alert handling")}</h2>
              </div>
              <span className={`pill ${entryStatusClass(alertCandidates.some((item) => item.level === "critical") ? "critical" : alertCandidates.length ? "warning" : "normal")}`}>
                {alertCandidates.length
                  ? `${alertCandidates.length} ${t(messages, "recordDetailPage.alertCandidatesCount", "candidates")}`
                  : t(messages, "recordDetailPage.alertCandidatesClear", "No alert candidates")}
              </span>
            </div>

            {alertCandidates.length ? (
              <div className="records-template-grid">
                {alertCandidates.map((candidate) => (
                  <article className="records-field-group-card" key={candidate.key}>
                    <span className={`pill ${entryStatusClass(candidate.level)}`}>{candidate.level}</span>
                    <h3>{candidate.title}</h3>
                    <p className="muted">{candidate.body}</p>
                    <div className="record-meta-list">
                      <span>{t(messages, "recordDetailPage.alertCandidateType", "Alert type")}: {label(candidate.alertType)}</span>
                    </div>
                    <div className="action-row">
                      <Link className="button-secondary" href={candidate.href}>
                        {t(messages, "recordDetailPage.alertCandidateAction", "Review matching alerts")}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "recordDetailPage.alertCandidatesEmptyEyebrow", "No immediate alert candidate")}</p>
                  <h2>{t(messages, "recordDetailPage.alertCandidatesEmptyTitle", "This record does not suggest a new alert candidate right now")}</h2>
                  <p className="muted">{t(messages, "recordDetailPage.alertCandidatesEmptyBody", "Keep using related alerts and the follow-up guidance as context until record-driven alert creation is introduced.")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "recordDetailPage.alertsEyebrow", "Related alerts")}</p>
                <h2>{t(messages, "recordDetailPage.alertsTitle", "Open farm alerts at the time of review")}</h2>
              </div>
              <span className={`pill ${entryStatusClass(detail.alerts.some((alert) => alert.severity === "critical") ? "critical" : detail.alerts.length ? "warning" : "normal")}`}>
                {detail.alerts.length
                  ? `${detail.alerts.length} ${t(messages, "recordDetailPage.alertsCount", "open alerts")}`
                  : t(messages, "recordDetailPage.alertsClear", "No open alerts")}
              </span>
            </div>
            {detail.alerts.length ? (
              <ul className="status-list">
                {detail.alerts.map((alert) => {
                  const device = Array.isArray(alert.devices) ? alert.devices[0] ?? null : alert.devices ?? null;

                  return (
                    <li className="mobile-list-row" key={alert.id}>
                      <span>
                        <strong>{label(alert.alert_type)}</strong>
                        <span className="list-meta">
                          {device?.serial_number ?? device?.device_id ?? alert.device_id ?? "Unknown device"} · {formatDate(alert.opened_at, true)}
                        </span>
                      </span>
                      <span className={`pill ${entryStatusClass(alert.severity === "critical" ? "critical" : "warning")}`}>{alert.severity}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-panel">
                <div>
                  <p className="eyebrow">{t(messages, "recordDetailPage.alertsEmptyEyebrow", "Alert state clear")}</p>
                  <h2>{t(messages, "recordDetailPage.alertsEmptyTitle", "No open farm alerts are linked right now")}</h2>
                  <p className="muted">{t(messages, "recordDetailPage.alertsEmptyBody", "Use this record as a clean checkpoint between monitoring rounds or before deeper alert logic is introduced.")}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="empty-panel dashboard-card">
          <div>
            <p className="eyebrow">{t(messages, "recordDetailPage.missingEyebrow", "Record unavailable")}</p>
            <h2>{t(messages, "recordDetailPage.missingTitle", "Record unavailable")}</h2>
            <p className="muted">{t(messages, "recordDetailPage.missingBody", "This record is not visible in the current workspace.")}</p>
          </div>
          <div className="action-row">
            <Link className="button" href="/records">{t(messages, "recordDetailPage.backAction", "Back to records")}</Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
