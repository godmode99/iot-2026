import { AppShell } from "@/components/app-shell.jsx";
import { SubmitButton } from "@/components/submit-button.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { getMessages, t } from "@/lib/i18n.js";
import { loadAccountSettings } from "@/lib/data/account-settings.js";
import { updateAccountSettings } from "./actions.js";

export const dynamic = "force-dynamic";

const LOCALE_OPTIONS = [
  { value: "th", label: "Thai" },
  { value: "en", label: "English" },
  { value: "my", label: "Myanmar" }
];

export default async function SettingsPage({ searchParams }) {
  const messages = await getMessages();
  const query = await searchParams;
  const { authConfigured } = await requireUser({ returnUrl: "/settings" });
  const settings = await loadAccountSettings();
  const saved = typeof query?.saved === "string" ? query.saved : "";
  const error = typeof query?.error === "string" ? query.error : "";

  return (
    <AppShell currentPath="/settings" ariaLabel="Account settings navigation" className="page-shell placeholder-layout">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {settings.error ? <section className="notice">{settings.error}</section> : null}
      {saved ? <section className="notice">{t(messages, "settings.saved")}</section> : null}
      {error ? <section className="notice">error: {error}</section> : null}

      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "settings.eyebrow")}</p>
        <h1 className="page-title">{t(messages, "settings.title")}</h1>
        <p className="lede">{t(messages, "settings.body")}</p>
        {settings.user?.email ? <p className="pill">{settings.user.email}</p> : null}

        <form className="form" action={updateAccountSettings}>
          <label>
            {t(messages, "settings.displayName")}
            <input
              name="display_name"
              maxLength={120}
              defaultValue={settings.profile?.displayName ?? ""}
              placeholder={settings.user?.email ?? "Operator"}
            />
          </label>
          <label>
            {t(messages, "settings.language")}
            <select name="preferred_locale" defaultValue={settings.profile?.preferredLocale ?? "th"}>
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(messages, `settings.locales.${option.value}`, option.label)}
                </option>
              ))}
            </select>
          </label>
          <div className="metric-grid">
            <div className="metric">
              <span className="muted">{t(messages, "settings.role")}</span>
              <span className="metric-value">{settings.profile?.userType ?? "guest"}</span>
            </div>
            <div className="metric">
              <span className="muted">{t(messages, "settings.locale")}</span>
              <span className="metric-value">{settings.profile?.preferredLocale ?? "th"}</span>
            </div>
          </div>
          <SubmitButton>{t(messages, "settings.saveAction")}</SubmitButton>
        </form>
      </section>
    </AppShell>
  );
}
