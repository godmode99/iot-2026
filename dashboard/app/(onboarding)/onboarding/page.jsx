import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { safeReturnUrl } from "@/lib/auth/urls.js";
import { getMessages, t } from "@/lib/i18n.js";
import { loadAccountSettings } from "@/lib/data/account-settings.js";
import { completeOnboarding } from "./actions.js";

export const dynamic = "force-dynamic";

const LOCALE_OPTIONS = [
  { value: "th", label: "Thai" },
  { value: "en", label: "English" },
  { value: "my", label: "Myanmar" }
];

export default async function OnboardingPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const next = safeReturnUrl(params?.next);
  const error = typeof params?.error === "string" ? params.error : "";
  const { authConfigured } = await requireUser({ returnUrl: `/onboarding?next=${encodeURIComponent(next)}` });
  const settings = await loadAccountSettings();

  return (
    <AppShell currentPath="/onboarding" ariaLabel="Onboarding navigation" className="page-shell placeholder-layout">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {settings.error ? <section className="notice">{settings.error}</section> : null}
      {error ? <section className="notice">error: {error}</section> : null}

      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "onboarding.eyebrow")}</p>
        <h1 className="page-title">{t(messages, "onboarding.title")}</h1>
        <p className="lede">{t(messages, "onboarding.body")}</p>
        {settings.user?.email ? <p className="pill">{settings.user.email}</p> : null}

        <form className="form" action={completeOnboarding}>
          <input name="next" type="hidden" value={next} />
          <label>
            {t(messages, "settings.displayName")}
            <input
              name="display_name"
              maxLength={120}
              defaultValue={settings.profile?.displayName ?? ""}
              placeholder={settings.user?.email ?? "Farm owner"}
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
          <div className="dashboard-actions-grid" aria-label={t(messages, "onboarding.nextSteps")}>
            <Link className="action-card" href="/farms/new">
              <span className="eyebrow">{t(messages, "farmCreate.eyebrow")}</span>
              <strong>{t(messages, "farmCreate.createAction")}</strong>
              <span className="muted">{t(messages, "farmCreate.body")}</span>
            </Link>
            <Link className="action-card" href="/provision">
              <span className="eyebrow">{t(messages, "nav.provision")}</span>
              <strong>{t(messages, "placeholder.provisionTitle")}</strong>
              <span className="muted">{t(messages, "provision.stateBody")}</span>
            </Link>
          </div>
          <button className="button" type="submit">{t(messages, "onboarding.continueAction")}</button>
        </form>
      </section>
    </AppShell>
  );
}
