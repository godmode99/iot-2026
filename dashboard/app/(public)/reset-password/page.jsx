import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";

  return (
    <AuthShell
      body={t(messages, "auth.resetPasswordBody")}
      eyebrow={t(messages, "auth.resetPassword")}
      footer={<Link href="/login">{t(messages, "nav.login")}</Link>}
      messages={messages}
      notice={(
        <>
          {error ? <p className="notice">Auth status: {error}</p> : null}
        </>
      )}
      title={t(messages, "auth.resetPassword")}
    >
      <div className="notice">
        {t(messages, "auth.oauthRecoveryBody")}
      </div>
      <Link className="button" href="/login">{t(messages, "auth.backToLogin")}</Link>
    </AuthShell>
  );
}
