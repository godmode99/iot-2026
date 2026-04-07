import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export async function LegalPage({ bodyKey, eyebrowKey, titleKey, updatedKey }) {
  const messages = await getMessages();
  const sections = t(messages, bodyKey, []);

  return (
    <main className="page-shell legal-shell">
      <nav className="topbar" aria-label="Legal">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/login">{t(messages, "nav.login")}</Link>
          <Link className="button-secondary" href="/signup">{t(messages, "nav.signup")}</Link>
        </div>
      </nav>

      <section className="card legal-card">
        <p className="eyebrow">{t(messages, eyebrowKey)}</p>
        <h1>{t(messages, titleKey)}</h1>
        <p className="muted">{t(messages, updatedKey)}</p>
        <div className="legal-content">
          {Array.isArray(sections) ? sections.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p className="muted" key={paragraph}>{paragraph}</p>
              ))}
            </article>
          )) : null}
        </div>
      </section>
    </main>
  );
}
