import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadFarmSettings } from "@/lib/data/farm-settings.js";
import { assignReseller, createMemberInvite, updateOwnNotificationPreference } from "./actions.js";

export const dynamic = "force-dynamic";

function PermissionPills({ item }) {
  const permissions = [
    item.can_view ? "view" : null,
    item.can_receive_alerts ? "alerts" : null,
    item.can_manage_alerts ? "manage alerts" : null,
    item.can_send_commands ? "commands" : null,
    item.can_send_safe_commands ? "safe commands" : null
  ].filter(Boolean);

  return permissions.length ? permissions.map((permission) => <span className="pill" key={permission}>{permission}</span>) : <span className="muted">view only</span>;
}

function inviteCookieName(farmId) {
  return `sb_invite_token_${farmId}`;
}

function inviteAcceptPath(inviteToken) {
  return `/invites/accept?token=${encodeURIComponent(inviteToken)}`;
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

  return (
    <AppShell currentPath={`/farms/${farmId}`} ariaLabel="Farm settings navigation" className="page-shell placeholder-layout">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {feedback.length ? <section className="notice">{feedback.join(" / ")}</section> : null}

      <section className="card">
        <p className="eyebrow">{t(messages, "farmSettings.eyebrow")}</p>
        <h1 className="page-title">{settings?.farm?.name ?? t(messages, "farmSettings.notFoundTitle")}</h1>
        <p className="lede">{settings?.farm ? t(messages, "farmSettings.body") : t(messages, "farmSettings.notFoundBody")}</p>
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
        <>
          <section className="dashboard-grid">
            <div className="card">
              <h2>{t(messages, "farmSettings.members")}</h2>
              {settings.members.length ? (
                <ul className="status-list">
                  {settings.members.map((member) => (
                    <li key={member.id}>
                      <span>{member.email}</span>
                      <span className="pill-row"><PermissionPills item={member} /></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "farmSettings.noMembers")}</p>}
            </div>

            <div className="card">
              <h2>{t(messages, "farmSettings.inviteMember")}</h2>
              <form className="form" action={createMemberInvite}>
                <input type="hidden" name="farm_id" value={farmId} />
                <label>
                  {t(messages, "auth.email")}
                  <input name="email" type="email" required />
                </label>
                <label className="check-row"><input type="checkbox" name="can_receive_alerts" defaultChecked /> {t(messages, "farmSettings.receiveAlerts")}</label>
                <label className="check-row"><input type="checkbox" name="can_manage_alerts" /> {t(messages, "farmSettings.manageAlerts")}</label>
                <label className="check-row"><input type="checkbox" name="can_send_commands" /> {t(messages, "farmSettings.sendCommands")}</label>
                <button className="button" type="submit">{t(messages, "farmSettings.createInvite")}</button>
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
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="card">
              <h2>{t(messages, "farmSettings.resellers")}</h2>
              {settings.resellers.length ? (
                <ul className="status-list">
                  {settings.resellers.map((assignment) => (
                    <li key={assignment.id}>
                      <span>{assignment.email}</span>
                      <span className="pill-row"><PermissionPills item={assignment} /></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "farmSettings.noResellers")}</p>}
            </div>

            <div className="card">
              <h2>{t(messages, "farmSettings.assignReseller")}</h2>
              <form className="form" action={assignReseller}>
                <input type="hidden" name="farm_id" value={farmId} />
                <label>
                  {t(messages, "farmSettings.resellerUserId")}
                  <input name="reseller_user_id" required placeholder="00000000-0000-0000-0000-000000000000" />
                </label>
                <label className="check-row"><input type="checkbox" name="can_manage_alerts" /> {t(messages, "farmSettings.manageAlerts")}</label>
                <label className="check-row"><input type="checkbox" name="can_send_safe_commands" /> {t(messages, "farmSettings.sendSafeCommands")}</label>
                <button className="button" type="submit">{t(messages, "farmSettings.assignResellerAction")}</button>
              </form>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="card">
              <h2>{t(messages, "farmSettings.notificationPreferences")}</h2>
              <form className="form" action={updateOwnNotificationPreference}>
                <input type="hidden" name="farm_id" value={farmId} />
                <label className="check-row"><input type="checkbox" name="email_enabled" defaultChecked /> Email</label>
                <label className="check-row"><input type="checkbox" name="line_enabled" /> LINE</label>
                <label className="check-row"><input type="checkbox" name="critical_only" /> {t(messages, "farmSettings.criticalOnly")}</label>
                {["threshold", "low_battery", "sensor_fault", "offline"].map((alertType) => (
                  <label className="check-row" key={alertType}>
                    <input type="checkbox" name={`alert_${alertType}`} defaultChecked /> {alertType}
                  </label>
                ))}
                <button className="button" type="submit">{t(messages, "farmSettings.savePreference")}</button>
              </form>
            </div>

            <div className="card">
              <h2>{t(messages, "farmSettings.audit")}</h2>
              {settings.audit.length ? (
                <ul className="status-list">
                  {settings.audit.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.action}</span>
                      <span className="pill">{new Date(entry.created_at).toLocaleDateString("en-CA")}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t(messages, "farmSettings.noAudit")}</p>}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
