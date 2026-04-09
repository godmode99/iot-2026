import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export const metadata = {
  title: "Packages | ArayaShiki Lab"
};

export default async function PackagesPage() {
  const messages = await getMessages();
  const packages = ["research", "operations", "enterprise"].map((item) => ({
    title: t(messages, `packagesPage.packages.${item}.title`),
    body: t(messages, `packagesPage.packages.${item}.body`),
    fit: t(messages, `packagesPage.packages.${item}.fit`),
    deliverables: t(messages, `packagesPage.packages.${item}.deliverables`, [])
  }));
  const principles = ["start", "shared", "expand"].map((item) => ({
    title: t(messages, `packagesPage.principles.${item}.title`),
    body: t(messages, `packagesPage.principles.${item}.body`)
  }));

  return (
    <main className="page-shell solutions-shell">
      <nav className="topbar" aria-label="Packages">
        <Link className="brand brand-wordmark" href="/" aria-label={t(messages, "brand.name")}>
          <span className="brand-wordmark-main">ArayaShiki</span>
          <span className="brand-wordmark-sep" aria-hidden="true" />
          <span className="brand-wordmark-sub">Lab</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/">{t(messages, "packagesPage.nav.home")}</Link>
          <Link className="nav-link" href="/about">{t(messages, "packagesPage.nav.about")}</Link>
          <Link className="nav-link" href="/solutions">{t(messages, "packagesPage.nav.solutions")}</Link>
          <Link className="nav-link" href="/request-demo">{t(messages, "packagesPage.nav.requestDemo")}</Link>
          <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
        </div>
      </nav>

      <section className="solutions-hero">
        <div className="solutions-hero-copy">
          <p className="eyebrow">{t(messages, "packagesPage.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "packagesPage.title")}</h1>
          <p className="lede">{t(messages, "packagesPage.body")}</p>
          <div className="action-row">
            <Link className="button" href="/request-demo">{t(messages, "packagesPage.primary")}</Link>
            <Link className="button-secondary" href="/login">{t(messages, "packagesPage.secondary")}</Link>
          </div>
        </div>
        <aside className="solutions-highlight">
          <p className="eyebrow">{t(messages, "packagesPage.highlightEyebrow")}</p>
          <h2>{t(messages, "packagesPage.highlightTitle")}</h2>
          <p className="muted">{t(messages, "packagesPage.highlightBody")}</p>
        </aside>
      </section>

      <section className="solutions-track-section" aria-labelledby="packages-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "packagesPage.packagesEyebrow")}</p>
          <h2 id="packages-title">{t(messages, "packagesPage.packagesTitle")}</h2>
          <p className="muted">{t(messages, "packagesPage.packagesBody")}</p>
        </div>
        <div className="package-grid">
          {packages.map((item) => (
            <article className="package-card" key={item.title}>
              <div className="package-card-top">
                <p className="package-fit">{item.fit}</p>
                <h3>{item.title}</h3>
                <p className="muted">{item.body}</p>
              </div>
              <ul className="solutions-bullet-list">
                {Array.isArray(item.deliverables)
                  ? item.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)
                  : null}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions-layer-section" aria-labelledby="package-principles-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "packagesPage.principlesEyebrow")}</p>
          <h2 id="package-principles-title">{t(messages, "packagesPage.principlesTitle")}</h2>
          <p className="muted">{t(messages, "packagesPage.principlesBody")}</p>
        </div>
        <div className="solutions-layer-grid">
          {principles.map((item) => (
            <article className="solutions-layer-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta-panel">
        <div>
          <p className="eyebrow">{t(messages, "packagesPage.ctaEyebrow")}</p>
          <h2>{t(messages, "packagesPage.ctaTitle")}</h2>
          <p className="muted">{t(messages, "packagesPage.ctaBody")}</p>
        </div>
        <div className="action-row">
          <Link className="button" href="/request-demo">{t(messages, "packagesPage.ctaPrimary")}</Link>
          <Link className="button-secondary" href="/">{t(messages, "packagesPage.ctaSecondary")}</Link>
        </div>
      </section>
    </main>
  );
}
