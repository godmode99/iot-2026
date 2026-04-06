import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function HomePage() {
  const messages = await getMessages();
  const proofItems = ["roles", "mobile", "secure"].map((item) => ({
    label: t(messages, `home.proof.${item}.label`),
    value: t(messages, `home.proof.${item}.value`)
  }));
  const lanes = ["customers", "resellers", "operators"].map((lane) => ({
    title: t(messages, `home.lanes.${lane}.title`),
    body: t(messages, `home.lanes.${lane}.body`)
  }));

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/login">{t(messages, "nav.login")}</Link>
          <Link className="button-secondary" href="/signup">{t(messages, "nav.signup")}</Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-hero-heading">
            <p className="eyebrow">{t(messages, "home.eyebrow")}</p>
            <h1>{t(messages, "home.title")}</h1>
            <p className="lede">{t(messages, "home.body")}</p>
          </div>
          <div className="action-row">
            <Link className="button" href="/dashboard">{t(messages, "home.primary")}</Link>
            <Link className="button-secondary" href="/login">{t(messages, "home.secondary")}</Link>
          </div>
        </div>

        <aside className="home-signal-panel" aria-label={t(messages, "home.panelLabel")}>
          <div>
            <p className="eyebrow">{t(messages, "home.panelEyebrow")}</p>
            <h2>{t(messages, "home.panelTitle")}</h2>
          </div>
          <div className="home-signal-map" aria-hidden="true">
            <span className="home-node home-node-primary" />
            <span className="home-node home-node-secondary" />
            <span className="home-node home-node-tertiary" />
            <span className="home-signal-line home-signal-line-a" />
            <span className="home-signal-line home-signal-line-b" />
          </div>
          <div className="home-proof-grid">
            {proofItems.map((item) => (
              <div className="home-proof-item" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="home-lanes" aria-label={t(messages, "home.lanesLabel")}>
        {lanes.map((lane) => (
          <article className="home-lane" key={lane.title}>
            <span aria-hidden="true" />
            <div>
              <h2>{lane.title}</h2>
              <p className="muted">{lane.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="home-cta-panel">
        <div>
          <p className="eyebrow">{t(messages, "home.ctaEyebrow")}</p>
          <h2>{t(messages, "home.ctaTitle")}</h2>
          <p className="muted">{t(messages, "home.ctaBody")}</p>
        </div>
        <div className="action-row">
          <Link className="button" href="/signup">{t(messages, "home.ctaPrimary")}</Link>
          <Link className="button-secondary" href="/provision">{t(messages, "home.ctaSecondary")}</Link>
        </div>
      </section>
    </main>
  );
}
