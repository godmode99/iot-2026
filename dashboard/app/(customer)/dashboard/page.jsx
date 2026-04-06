import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadCustomerDashboard } from "@/lib/data/customer-dashboard.js";
import { signOut } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const messages = await getMessages();
  const { authConfigured, user } = await requireUser({ returnUrl: "/dashboard" });
  const dashboard = user ? await loadCustomerDashboard() : null;
  const farmCount = dashboard?.farms.length ?? 0;
  const deviceCount = dashboard?.devices.length ?? 0;
  const openAlertCount = dashboard?.openAlerts.length ?? 0;

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Dashboard navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/farms/new">{t(messages, "nav.newFarm")}</Link>
          <Link className="nav-link" href="/provision">{t(messages, "nav.provision")}</Link>
          <Link className="nav-link" href="/ops">{t(messages, "nav.ops")}</Link>
          {authConfigured ? (
            <form action={signOut}>
              <button className="button-secondary nav-button" type="submit">{t(messages, "nav.signout")}</button>
            </form>
          ) : null}
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
            <span className="metric-value">{farmCount}</span>
            <span className="muted">{t(messages, "dashboard.farms")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{deviceCount}</span>
            <span className="muted">{t(messages, "dashboard.devices")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{openAlertCount}</span>
            <span className="muted">{t(messages, "dashboard.openAlerts")}</span>
          </div>
        </div>
      </section>

      {dashboard?.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {dashboard.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card dashboard-card">
        <h2>{t(messages, "dashboard.emptyTitle")}</h2>
        <p className="muted">{t(messages, "dashboard.emptyBody")}</p>
        <div className="action-row">
          <Link className="button" href="/farms/new">{t(messages, "farmCreate.createAction")}</Link>
          <Link className="button-secondary" href="/provision">{t(messages, "nav.provision")}</Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card">
          <h2>{t(messages, "dashboard.recentFarms")}</h2>
          {dashboard?.farms.length ? (
            <ul className="status-list">
              {dashboard.farms.map((farm) => (
                <li key={farm.id}>
                  <Link href={`/farms/${farm.id}`}>{farm.name}</Link>
                  <span className="pill">farm</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "dashboard.noFarms")}</p>
          )}
        </div>

        <div className="card">
          <h2>{t(messages, "dashboard.visibleDevices")}</h2>
          {dashboard?.devices.length ? (
            <ul className="status-list">
              {dashboard.devices.map((device) => (
                <li key={device.id}>
                  <Link href={`/devices/${device.device_id}`}>{device.device_id}</Link>
                  <span className="pill">{device.battery_variant}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t(messages, "dashboard.noDevices")}</p>
          )}
        </div>
      </section>
    </main>
  );
}
