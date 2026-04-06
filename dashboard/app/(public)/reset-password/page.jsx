import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { updatePassword } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";
  const { authConfigured } = await requireUser({ returnUrl: "/reset-password" });

  return (
    <main className="page-shell">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>{t(messages, "brand.name")}</span>
      </Link>
      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "auth.resetPassword")}</p>
        <h1 className="page-title">{t(messages, "auth.resetPassword")}</h1>
        <p className="muted">{t(messages, "auth.resetPasswordBody")}</p>
        {!authConfigured ? <p className="notice">{t(messages, "auth.setupPending")}</p> : null}
        {error ? <p className="notice">Auth status: {error}</p> : null}
        <form className="form" action={updatePassword}>
          <label>
            {t(messages, "auth.newPassword")}
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <label>
            {t(messages, "auth.confirmPassword")}
            <input name="confirm_password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <button className="button" type="submit">{t(messages, "auth.updatePasswordAction")}</button>
        </form>
        <p className="muted auth-footnote">
          <Link href="/login">{t(messages, "nav.login")}</Link>
        </p>
      </section>
    </main>
  );
}
