import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function HomePage() {
  const messages = await getMessages();
  const proofItems = ["audiences", "inputs", "readiness"].map((item) => ({
    label: t(messages, `home.proof.${item}.label`),
    value: t(messages, `home.proof.${item}.value`)
  }));
  const lanes = ["ecosystem", "flagship", "roadmap"].map((lane) => ({
    title: t(messages, `home.lanes.${lane}.title`),
    body: t(messages, `home.lanes.${lane}.body`)
  }));
  const pillars = ["human", "board", "rules", "orchestration"].map((item) => ({
    title: t(messages, `home.pillars.${item}.title`),
    body: t(messages, `home.pillars.${item}.body`)
  }));
  const solutions = ["research", "operations", "enterprise"].map((item) => ({
    title: t(messages, `home.solutions.${item}.title`),
    body: t(messages, `home.solutions.${item}.body`)
  }));
  const roadmap = ["monitoring", "automation", "process"].map((item) => ({
    title: t(messages, `home.roadmap.${item}.title`),
    body: t(messages, `home.roadmap.${item}.body`)
  }));

  return (
    <main className="page-shell landing-shell">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand brand-wordmark" href="/" aria-label={t(messages, "brand.name")}>
          <span className="brand-wordmark-main">ArayaShiki</span>
          <span className="brand-wordmark-sep" aria-hidden="true" />
          <span className="brand-wordmark-sub">Lab</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/about">{t(messages, "home.nav.about")}</Link>
          <Link className="nav-link" href="#ecosystem">{t(messages, "home.nav.ecosystem")}</Link>
          <Link className="nav-link" href="/solutions">{t(messages, "home.nav.solutions")}</Link>
          <Link className="nav-link" href="/packages">{t(messages, "home.nav.packages")}</Link>
          <Link className="nav-link" href="#roadmap">{t(messages, "home.nav.roadmap")}</Link>
          <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
        </div>
      </nav>

      <section className="home-hero">
        <aside className="home-signal-panel home-brand-stage" aria-label={t(messages, "home.panelLabel")}>
          <div className="home-stage-copy">
            <p className="eyebrow">{t(messages, "home.panelEyebrow")}</p>
            <h2>{t(messages, "home.panelTitle")}</h2>
            <p className="muted">{t(messages, "home.panelBody")}</p>
          </div>
          <div className="home-logo-stage" aria-hidden="true">
            <span className="home-gold-orbit" />
            <span className="home-scan-line home-scan-line-a" />
            <span className="home-scan-line home-scan-line-b" />
            <img
              className="home-logo-art"
              src="/brand/arayashiki-lab-logo-full.svg"
              alt=""
            />
          </div>
          <div className="action-row home-stage-actions">
            <Link className="button" href="/solutions">{t(messages, "home.panelPrimary")}</Link>
            <Link className="button-secondary" href="/login">{t(messages, "home.panelSecondary")}</Link>
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

        <div className="home-hero-copy">
          <div className="home-kicker" aria-label="Brand and product">
            <span className="home-kicker-brand">{t(messages, "brand.name")}</span>
            <span className="home-kicker-system">{t(messages, "home.kicker")}</span>
          </div>
          <div className="home-hero-heading">
            <p className="eyebrow">{t(messages, "home.eyebrow")}</p>
            <h1>{t(messages, "home.title")}</h1>
            <p className="lede">{t(messages, "home.body")}</p>
            <div className="action-row">
              <Link className="button" href="/solutions">{t(messages, "home.primary")}</Link>
              <Link className="button-secondary" href="/packages">{t(messages, "home.secondary")}</Link>
            </div>
            <p className="home-caption">{t(messages, "home.caption")}</p>
          </div>
        </div>
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

      <section className="home-ecosystem" id="ecosystem" aria-labelledby="ecosystem-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "home.ecosystemEyebrow")}</p>
          <h2 id="ecosystem-title">{t(messages, "home.ecosystemTitle")}</h2>
          <p className="muted">{t(messages, "home.ecosystemBody")}</p>
        </div>
        <div className="home-pillar-grid">
          {pillars.map((pillar) => (
            <article className="home-pillar" key={pillar.title}>
              <span aria-hidden="true" />
              <h3>{pillar.title}</h3>
              <p className="muted">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-solutions" id="solutions" aria-labelledby="solutions-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "home.solutionsEyebrow")}</p>
          <h2 id="solutions-title">{t(messages, "home.solutionsTitle")}</h2>
          <p className="muted">{t(messages, "home.solutionsBody")}</p>
        </div>
        <div className="home-solution-grid">
          {solutions.map((solution) => (
            <article className="home-solution" key={solution.title}>
              <h3>{solution.title}</h3>
              <p className="muted">{solution.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-roadmap" id="roadmap" aria-labelledby="roadmap-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "home.roadmapEyebrow")}</p>
          <h2 id="roadmap-title">{t(messages, "home.roadmapTitle")}</h2>
          <p className="muted">{t(messages, "home.roadmapBody")}</p>
        </div>
        <div className="home-roadmap-grid">
          {roadmap.map((item) => (
            <article className="home-roadmap-step" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta-panel">
        <div>
          <p className="eyebrow">{t(messages, "home.ctaEyebrow")}</p>
          <h2>{t(messages, "home.ctaTitle")}</h2>
          <p className="muted">{t(messages, "home.ctaBody")}</p>
        </div>
        <div className="action-row">
          <Link className="button" href="/packages">{t(messages, "home.ctaPrimary")}</Link>
          <Link className="button-secondary" href="/solutions">{t(messages, "home.ctaSecondary")}</Link>
        </div>
      </section>
    </main>
  );
}
