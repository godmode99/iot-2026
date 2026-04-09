import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export const metadata = {
  title: "Solutions | ArayaShiki Lab"
};

export default async function SolutionsPage() {
  const messages = await getMessages();
  const tracks = ["research", "operations", "enterprise"].map((item) => ({
    title: t(messages, `solutionsPage.tracks.${item}.title`),
    body: t(messages, `solutionsPage.tracks.${item}.body`),
    bullets: t(messages, `solutionsPage.tracks.${item}.bullets`, [])
  }));
  const layers = ["capture", "monitoring", "automation", "orchestration"].map((item) => ({
    title: t(messages, `solutionsPage.layers.${item}.title`),
    body: t(messages, `solutionsPage.layers.${item}.body`)
  }));

  return (
    <main className="page-shell solutions-shell">
      <nav className="topbar" aria-label="Solutions">
        <Link className="brand brand-wordmark" href="/" aria-label={t(messages, "brand.name")}>
          <span className="brand-wordmark-main">ArayaShiki</span>
          <span className="brand-wordmark-sep" aria-hidden="true" />
          <span className="brand-wordmark-sub">Lab</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/about">{t(messages, "solutionsPage.nav.about")}</Link>
          <Link className="nav-link" href="/">{t(messages, "solutionsPage.nav.home")}</Link>
          <Link className="nav-link" href="/packages">{t(messages, "solutionsPage.nav.packages")}</Link>
          <Link className="nav-link" href="/#roadmap">{t(messages, "solutionsPage.nav.roadmap")}</Link>
          <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
        </div>
      </nav>

      <section className="solutions-hero">
        <div className="solutions-hero-copy">
          <p className="eyebrow">{t(messages, "solutionsPage.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "solutionsPage.title")}</h1>
          <p className="lede">{t(messages, "solutionsPage.body")}</p>
          <div className="action-row">
            <Link className="button" href="/packages">{t(messages, "solutionsPage.primary")}</Link>
            <Link className="button-secondary" href="/#ecosystem">{t(messages, "solutionsPage.secondary")}</Link>
          </div>
        </div>
        <aside className="solutions-highlight">
          <p className="eyebrow">{t(messages, "solutionsPage.highlightEyebrow")}</p>
          <h2>{t(messages, "solutionsPage.highlightTitle")}</h2>
          <p className="muted">{t(messages, "solutionsPage.highlightBody")}</p>
        </aside>
      </section>

      <section className="solutions-track-section" aria-labelledby="solutions-track-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "solutionsPage.tracksEyebrow")}</p>
          <h2 id="solutions-track-title">{t(messages, "solutionsPage.tracksTitle")}</h2>
          <p className="muted">{t(messages, "solutionsPage.tracksBody")}</p>
        </div>
        <div className="solutions-track-grid">
          {tracks.map((track) => (
            <article className="solutions-track-card" key={track.title}>
              <h3>{track.title}</h3>
              <p className="muted">{track.body}</p>
              <ul className="solutions-bullet-list">
                {Array.isArray(track.bullets) ? track.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                )) : null}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions-layer-section" aria-labelledby="solutions-layer-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "solutionsPage.layersEyebrow")}</p>
          <h2 id="solutions-layer-title">{t(messages, "solutionsPage.layersTitle")}</h2>
          <p className="muted">{t(messages, "solutionsPage.layersBody")}</p>
        </div>
        <div className="solutions-layer-grid">
          {layers.map((layer) => (
            <article className="solutions-layer-card" key={layer.title}>
              <h3>{layer.title}</h3>
              <p className="muted">{layer.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta-panel">
        <div>
          <p className="eyebrow">{t(messages, "solutionsPage.ctaEyebrow")}</p>
          <h2>{t(messages, "solutionsPage.ctaTitle")}</h2>
          <p className="muted">{t(messages, "solutionsPage.ctaBody")}</p>
        </div>
        <div className="action-row">
          <Link className="button" href="/packages">{t(messages, "solutionsPage.ctaPrimary")}</Link>
          <Link className="button-secondary" href="/">{t(messages, "solutionsPage.ctaSecondary")}</Link>
        </div>
      </section>
    </main>
  );
}
