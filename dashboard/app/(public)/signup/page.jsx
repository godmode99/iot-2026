import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { signUpWithPassword } from "../login/actions.js";

export default async function SignupPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";

  return (
    <AuthShell
      eyebrow={t(messages, "nav.signup")}
      footer={<Link href="/login">{t(messages, "nav.login")}</Link>}
      messages={messages}
      notice={error ? <p className="notice">Auth status: {error}</p> : null}
      title={t(messages, "auth.signupTitle")}
    >
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
    </AuthShell>
  );
}
