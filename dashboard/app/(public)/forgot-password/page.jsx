import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";
import { requestPasswordReset } from "./actions.js";

export default async function ForgotPasswordPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";
  const notice = typeof params?.notice === "string" ? params.notice : "";

  return (
    <main className="page-shell">
      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "auth.forgotPassword")}</p>
        <h1 className="page-title">{t(messages, "auth.forgotPassword")}</h1>
        <p className="muted">{t(messages, "auth.forgotPasswordBody")}</p>
        {error ? <p className="notice">Auth status: {error}</p> : null}
        {notice ? <p className="notice">Notice: {notice}</p> : null}
        <form className="form" action={requestPasswordReset}>
          <label>
            {t(messages, "auth.email")}
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button" type="submit">{t(messages, "auth.sendResetAction")}</button>
        </form>
        <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
      </section>
    </main>
  );
}
