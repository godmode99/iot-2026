import Link from "next/link";
import { AuthShell } from "@/components/auth-shell.jsx";
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
    <AuthShell
      body={t(messages, "auth.resetPasswordBody")}
      eyebrow={t(messages, "auth.resetPassword")}
      footer={<Link href="/login">{t(messages, "nav.login")}</Link>}
      messages={messages}
      notice={(
        <>
          {!authConfigured ? <p className="notice">{t(messages, "auth.setupPending")}</p> : null}
          {error ? <p className="notice">Auth status: {error}</p> : null}
        </>
      )}
      title={t(messages, "auth.resetPassword")}
    >
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
    </AuthShell>
  );
}
