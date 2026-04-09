import Link from "next/link";
import { PublicTopbar } from "@/components/public-topbar.jsx";
import { getMessages, t } from "@/lib/i18n.js";

export const metadata = {
  title: "About | ArayaShiki Lab"
};

export default async function AboutPage() {
  const messages = await getMessages();
  const principles = ["operations", "connected", "growth"].map((item) => ({
    title: t(messages, `aboutPage.principles.${item}.title`),
    body: t(messages, `aboutPage.principles.${item}.body`)
  }));
  const audiences = ["research", "farm", "enterprise"].map((item) => ({
    title: t(messages, `aboutPage.audiences.${item}.title`),
    body: t(messages, `aboutPage.audiences.${item}.body`)
  }));
  const roadmap = ["capture", "monitoring", "control", "process"].map((item) => ({
    title: t(messages, `aboutPage.roadmap.${item}.title`),
    body: t(messages, `aboutPage.roadmap.${item}.body`)
  }));
  const navItems = [
    { href: "/", label: t(messages, "aboutPage.nav.home") },
    { href: "/solutions", label: t(messages, "aboutPage.nav.solutions") },
    { href: "/packages", label: t(messages, "aboutPage.nav.packages") },
    { href: "/#roadmap", label: t(messages, "aboutPage.nav.roadmap") }
  ];

  return (
    <main className="page-shell solutions-shell">
      <PublicTopbar
        actionHref="/login"
        actionLabel={t(messages, "nav.login")}
        ariaLabel="About"
        brandLabel={t(messages, "brand.name")}
        navItems={navItems}
      />

      <section className="solutions-hero">
        <div className="solutions-hero-copy">
          <p className="eyebrow">{t(messages, "aboutPage.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "aboutPage.title")}</h1>
          <p className="lede">{t(messages, "aboutPage.body")}</p>
          <div className="action-row">
            <Link className="button" href="/solutions">{t(messages, "aboutPage.primary")}</Link>
            <Link className="button-secondary" href="/packages">{t(messages, "aboutPage.secondary")}</Link>
          </div>
        </div>
        <aside className="solutions-highlight">
          <p className="eyebrow">{t(messages, "aboutPage.highlightEyebrow")}</p>
          <h2>{t(messages, "aboutPage.highlightTitle")}</h2>
          <p className="muted">{t(messages, "aboutPage.highlightBody")}</p>
        </aside>
      </section>

      <section className="solutions-track-section" aria-labelledby="about-principles-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "aboutPage.principlesEyebrow")}</p>
          <h2 id="about-principles-title">{t(messages, "aboutPage.principlesTitle")}</h2>
          <p className="muted">{t(messages, "aboutPage.principlesBody")}</p>
        </div>
        <div className="solutions-track-grid">
          {principles.map((item) => (
            <article className="solutions-track-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions-track-section" aria-labelledby="about-audiences-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "aboutPage.audiencesEyebrow")}</p>
          <h2 id="about-audiences-title">{t(messages, "aboutPage.audiencesTitle")}</h2>
          <p className="muted">{t(messages, "aboutPage.audiencesBody")}</p>
        </div>
        <div className="solutions-track-grid">
          {audiences.map((item) => (
            <article className="solutions-track-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions-layer-section" aria-labelledby="about-roadmap-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "aboutPage.roadmapEyebrow")}</p>
          <h2 id="about-roadmap-title">{t(messages, "aboutPage.roadmapTitle")}</h2>
          <p className="muted">{t(messages, "aboutPage.roadmapBody")}</p>
        </div>
        <div className="solutions-layer-grid">
          {roadmap.map((item) => (
            <article className="solutions-layer-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta-panel">
        <div>
          <p className="eyebrow">{t(messages, "aboutPage.ctaEyebrow")}</p>
          <h2>{t(messages, "aboutPage.ctaTitle")}</h2>
          <p className="muted">{t(messages, "aboutPage.ctaBody")}</p>
        </div>
        <div className="action-row">
          <Link className="button" href="/packages">{t(messages, "aboutPage.ctaPrimary")}</Link>
          <Link className="button-secondary" href="/">{t(messages, "aboutPage.ctaSecondary")}</Link>
        </div>
      </section>
    </main>
  );
}
