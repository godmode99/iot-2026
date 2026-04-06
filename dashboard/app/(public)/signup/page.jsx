import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";
import { signUpWithPassword } from "../login/actions.js";

export default async function SignupPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";

  return (
    <main className="page-shell">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>{t(messages, "brand.name")}</span>
      </Link>
      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "nav.signup")}</p>
        <h1 className="page-title">{t(messages, "auth.signupTitle")}</h1>
        {error ? <p className="notice">Auth status: {error}</p> : null}
        <form className="form" action={signUpWithPassword}>
          <label>
            {t(messages, "auth.email")}
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            {t(messages, "auth.password")}
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <button className="button" type="submit">{t(messages, "auth.signupAction")}</button>
        </form>
        <p className="muted auth-footnote">
          <Link href="/login">{t(messages, "nav.login")}</Link>
        </p>
      </section>
    </main>
  );
}

