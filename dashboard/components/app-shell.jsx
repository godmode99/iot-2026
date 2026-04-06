import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";
import { loadAppShellContext } from "@/lib/data/app-shell.js";

function navItem(href, label, currentPath) {
  const isActive = currentPath === href || (href !== "/" && currentPath?.startsWith(`${href}/`));
  return (
    <Link className={`nav-link${isActive ? " is-active" : ""}`} href={href} key={href}>
      {label}
    </Link>
  );
}

export async function AppShell({ children, currentPath = "", ariaLabel = "Primary navigation", className = "page-shell" }) {
  const messages = await getMessages();
  const context = await loadAppShellContext();
  const navItems = [
    navItem("/dashboard", t(messages, "nav.dashboard"), currentPath),
    context.isReseller ? null : navItem("/farms/new", t(messages, "nav.newFarm"), currentPath),
    navItem("/provision", t(messages, "nav.provision"), currentPath),
    navItem("/settings", t(messages, "nav.settings"), currentPath),
    context.canAccessOps ? navItem("/ops", t(messages, "nav.ops"), currentPath) : null
  ].filter(Boolean);

  return (
    <main className={className}>
      <nav className="topbar app-topbar" aria-label={ariaLabel}>
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>{t(messages, "brand.name")}</span>
        </Link>
        <div className="nav-links app-nav-links">
          {navItems}
          {context.email ? (
            <span className="pill shell-user-pill" title={context.displayName || context.email}>
              {context.userType}
            </span>
          ) : null}
          {context.email ? (
            <form action="/auth/signout" method="post">
              <button className="button-secondary nav-button" type="submit">{t(messages, "nav.signout")}</button>
            </form>
          ) : (
            <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
          )}
        </div>
      </nav>
      {children}
    </main>
  );
}
