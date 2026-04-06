import Link from "next/link";
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
    <main className="page-shell placeholder-layout">
      <nav className="topbar" aria-label="New farm navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/dashboard">{t(messages, "nav.dashboard")}</Link>
          <Link className="nav-link" href="/provision">{t(messages, "nav.provision")}</Link>
        </div>
      </nav>

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
          <button className="button" type="submit">{t(messages, "farmCreate.createAction")}</button>
        </form>
      </section>
    </main>
  );
}
