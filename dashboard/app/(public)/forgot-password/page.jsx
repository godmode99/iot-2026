import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";

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
      <div className="notice">
        {t(messages, "auth.oauthRecoveryBody")}
      </div>
      <Link className="button" href="/login">{t(messages, "auth.backToLogin")}</Link>
    </AuthShell>
  );
}
