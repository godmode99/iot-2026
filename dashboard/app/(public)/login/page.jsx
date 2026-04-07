import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { OAuthButtons } from "@/components/oauth-buttons.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { signInWithOAuth } from "./actions.js";

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
      <p className="muted">{t(messages, "auth.oauthOnlyBody")}</p>
      <OAuthButtons action={signInWithOAuth} messages={messages} returnUrl={returnUrl} />
    </AuthShell>
  );
}
