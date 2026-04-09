import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell.jsx";
import { SubmitButton } from "@/components/submit-button.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadFarmSettings } from "@/lib/data/farm-settings.js";
import { assignReseller, createMemberInvite, createMissingRecordAlertAction, updateOwnNotificationPreference } from "./actions.js";

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

function inviteCookieName(farmId) {
  return `sb_invite_token_${farmId}`;
}

function inviteAcceptPath(inviteToken) {
  return `/invites/accept?token=${encodeURIComponent(inviteToken)}`;
}

function Panel({ eyebrow, title, body, children, className = "" }) {
  return (
    <section className={`farm-panel ${className}`.trim()}>
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

export default async function FarmSettingsPage({ params, searchParams }) {
  const messages = await getMessages();
  const { farmId } = await params;
  const query = await searchParams;
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
                            <Link className="button-secondary" href="/records/new">
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
              <form className="form" action={updateOwnNotificationPreference}>
                <input type="hidden" name="farm_id" value={farmId} />
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
