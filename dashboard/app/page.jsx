import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function HomePage() {
  const messages = await getMessages();

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

      <section className="hero-grid">
        <div className="hero-panel">
          <div>
            <p className="eyebrow">{t(messages, "home.eyebrow")}</p>
            <h1>{t(messages, "home.title")}</h1>
            <p className="lede">{t(messages, "home.body")}</p>
          </div>
          <div className="action-row">
            <Link className="button" href="/dashboard">{t(messages, "home.primary")}</Link>
            <Link className="button-secondary" href="/login">{t(messages, "home.secondary")}</Link>
          </div>
        </div>

        <aside className="card-stack" aria-label="Portal readiness">
          <div className="card">
            <p className="eyebrow">FE-01</p>
            <h2>Next.js App Router shell</h2>
            <p className="muted">Auth helpers, route groups, and i18n are now owned by the production dashboard app.</p>
            <div className="metric-grid">
              <div className="metric">
                <span className="metric-value">3</span>
                <span className="muted">locales</span>
              </div>
              <div className="metric">
                <span className="metric-value">4</span>
                <span className="muted">roles</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h2>Migration stance</h2>
            <ul className="status-list">
              <li><span>Legacy MVP</span><span className="pill">preserved</span></li>
              <li><span>Service role in browser</span><span className="pill">blocked</span></li>
              <li><span>Customer monitor</span><span className="pill">next</span></li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

