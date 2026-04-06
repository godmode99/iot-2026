import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { signInWithPassword } from "./actions.js";

export default async function LoginPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const returnUrl = typeof params?.returnUrl === "string" ? params.returnUrl : "/dashboard";
  const error = typeof params?.error === "string" ? params.error : "";
  const notice = typeof params?.notice === "string" ? params.notice : "";

  return (
    <AuthShell
      eyebrow={t(messages, "nav.login")}
      footer={(
        <>
          <Link href="/signup">{t(messages, "nav.signup")}</Link>
          {" / "}
          <Link href="/forgot-password">{t(messages, "auth.forgotPassword")}</Link>
        </>
      )}
      messages={messages}
      notice={(
        <>
          {error ? <p className="notice">Auth status: {error}</p> : null}
          {notice ? <p className="notice">Notice: {notice}</p> : null}
        </>
      )}
      title={t(messages, "auth.loginTitle")}
    >
        <form className="form" action={signInWithPassword}>
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <label>
            {t(messages, "auth.email")}
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            {t(messages, "auth.password")}
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button" type="submit">{t(messages, "auth.loginAction")}</button>
        </form>
    </AuthShell>
  );
}
