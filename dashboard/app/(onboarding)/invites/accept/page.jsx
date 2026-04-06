import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { withParams } from "@/lib/auth/urls.js";
import { acceptInvite } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({ searchParams }) {
  const messages = await getMessages();
  const query = await searchParams;
  const token = typeof query?.token === "string" ? query.token : "";
  const error = typeof query?.error === "string" ? query.error : "";
  const { authConfigured, user } = await requireUser({
    returnUrl: withParams("/invites/accept", { token })
  });

  return (
    <AppShell currentPath="/invites/accept" ariaLabel="Invite acceptance navigation" className="page-shell placeholder-layout">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {error ? <section className="notice">error: {error}</section> : null}

      <section className="card auth-card">
        <p className="eyebrow">{t(messages, "inviteAccept.eyebrow")}</p>
        <h1 className="page-title">{t(messages, "inviteAccept.title")}</h1>
        <p className="lede">{t(messages, "inviteAccept.body")}</p>
        {user?.email ? <p className="pill">{t(messages, "dashboard.signedInAs")}: {user.email}</p> : null}

        <form className="form" action={acceptInvite}>
          <label>
            {t(messages, "inviteAccept.token")}
            <input name="invite_token" defaultValue={token} required />
          </label>
          <button className="button" type="submit">{t(messages, "inviteAccept.acceptAction")}</button>
        </form>
      </section>
    </AppShell>
  );
}
