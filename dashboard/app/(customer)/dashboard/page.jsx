import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const messages = await getMessages();
  const { authConfigured, user } = await requireUser({ returnUrl: "/dashboard" });

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Dashboard navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/provision">{t(messages, "nav.provision")}</Link>
          <Link className="nav-link" href="/ops">{t(messages, "nav.ops")}</Link>
        </div>
      </nav>

      <section className="card dashboard-card">
        <p className="eyebrow">{t(messages, "dashboard.eyebrow")}</p>
        <h1 className="page-title">{t(messages, "dashboard.title")}</h1>
        {!authConfigured ? (
          <p className="notice">{t(messages, "dashboard.authPending")}</p>
        ) : (
          <p className="pill">{t(messages, "dashboard.signedInAs")}: {user.email}</p>
        )}

        <div className="metric-grid dashboard-metrics">
          <div className="metric">
            <span className="metric-value">0</span>
            <span className="muted">farms connected</span>
          </div>
          <div className="metric">
            <span className="metric-value">0</span>
            <span className="muted">devices visible</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{t(messages, "dashboard.emptyTitle")}</h2>
        <p className="muted">{t(messages, "dashboard.emptyBody")}</p>
      </section>
    </main>
  );
}

