import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function ForgotPasswordPage() {
  const messages = await getMessages();

  return (
    <main className="page-shell">
      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "auth.forgotPassword")}</p>
        <h1 className="page-title">{t(messages, "auth.forgotPassword")}</h1>
        <p className="muted">Password reset email flow will be wired in the next auth ticket.</p>
        <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
      </section>
    </main>
  );
}

