import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requestPasswordReset } from "./actions.js";

export default async function ForgotPasswordPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";
  const notice = typeof params?.notice === "string" ? params.notice : "";

  return (
    <AuthShell
      body={t(messages, "auth.forgotPasswordBody")}
      eyebrow={t(messages, "auth.forgotPassword")}
      footer={<Link href="/login">{t(messages, "nav.login")}</Link>}
      messages={messages}
      notice={(
        <>
          {error ? <p className="notice">Auth status: {error}</p> : null}
          {notice ? <p className="notice">Notice: {notice}</p> : null}
        </>
      )}
      title={t(messages, "auth.forgotPassword")}
    >
        <form className="form" action={requestPasswordReset}>
          <label>
            {t(messages, "auth.email")}
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button" type="submit">{t(messages, "auth.sendResetAction")}</button>
        </form>
    </AuthShell>
  );
}
