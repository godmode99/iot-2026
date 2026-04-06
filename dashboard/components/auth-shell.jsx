import Link from "next/link";
import { t } from "@/lib/i18n.js";

export function AuthShell({
  body,
  children,
  eyebrow,
  footer,
  messages,
  notice,
  title
}) {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-side-panel">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div>
          <p className="eyebrow">{t(messages, "auth.portalEyebrow")}</p>
          <h1>{t(messages, "auth.portalTitle")}</h1>
          <p className="lede">{t(messages, "auth.portalBody")}</p>
        </div>
        <div className="auth-proof-strip" aria-label={t(messages, "auth.portalProofLabel")}>
          <span className="health-chip is-online">{t(messages, "auth.proofSecure")}</span>
          <span className="health-chip">{t(messages, "auth.proofMobile")}</span>
          <span className="health-chip">{t(messages, "auth.proofLanguages")}</span>
        </div>
      </section>

      <section className="card auth-card auth-card-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {body ? <p className="muted">{body}</p> : null}
        {notice}
        {children}
        {footer ? <p className="muted auth-footnote">{footer}</p> : null}
      </section>
    </main>
  );
}
