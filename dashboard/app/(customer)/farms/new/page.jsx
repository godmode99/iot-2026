import { AppShell } from "@/components/app-shell.jsx";
import { SubmitButton } from "@/components/submit-button.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { createFarm } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function NewFarmPage({ searchParams }) {
  const messages = await getMessages();
  const query = await searchParams;
  const { authConfigured } = await requireUser({ returnUrl: "/farms/new" });
  const error = typeof query?.error === "string" ? query.error : "";

  return (
    <AppShell currentPath="/farms/new" ariaLabel="New farm navigation" className="page-shell placeholder-layout">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {error ? <section className="notice">error: {error}</section> : null}

      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "farmCreate.eyebrow")}</p>
        <h1 className="page-title">{t(messages, "farmCreate.title")}</h1>
        <p className="lede">{t(messages, "farmCreate.body")}</p>

        <form className="form" action={createFarm}>
          <label>
            {t(messages, "farmCreate.name")}
            <input name="name" minLength={2} maxLength={120} required placeholder={t(messages, "farmCreate.namePlaceholder")} />
          </label>
          <label>
            {t(messages, "farmCreate.alertEmail")}
            <input name="alert_email_to" type="email" placeholder="alerts@example.com" />
          </label>
          <label>
            {t(messages, "farmCreate.alertLine")}
            <input name="alert_line_user_id" placeholder="Uxxxxxxxxxxxxxxxx" />
          </label>
          <SubmitButton>{t(messages, "farmCreate.createAction")}</SubmitButton>
        </form>
      </section>
    </AppShell>
  );
}
