import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
import { OAuthButtons } from "@/components/oauth-buttons.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { signInWithOAuth } from "../login/actions.js";

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
      <p className="muted">{t(messages, "auth.signupOauthBody")}</p>
      <OAuthButtons action={signInWithOAuth} messages={messages} returnUrl="/onboarding" />
    </AuthShell>
  );
}
