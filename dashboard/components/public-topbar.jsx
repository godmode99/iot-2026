"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicTopbar({
  ariaLabel,
  brandLabel,
  navItems,
  actionHref,
  actionLabel
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className={`topbar public-topbar${menuOpen ? " is-open" : ""}`} aria-label={ariaLabel}>
      <Link className="brand brand-wordmark" href="/" aria-label={brandLabel}>
        <span className="brand-wordmark-main">ArayaShiki</span>
        <span className="brand-wordmark-sep" aria-hidden="true" />
        <span className="brand-wordmark-sub">Lab</span>
      </Link>

      <div className="nav-links nav-links-desktop">
        {navItems.map((item) => (
          <Link className="nav-link" href={item.href} key={`${item.href}-${item.label}`}>
            {item.label}
          </Link>
        ))}
        <Link className="button-secondary" href={actionHref}>{actionLabel}</Link>
      </div>

      <button
        aria-controls="public-mobile-menu"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        className="menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`mobile-menu${menuOpen ? " is-open" : ""}`} id="public-mobile-menu">
        <div className="mobile-menu-links">
          {navItems.map((item) => (
            <Link
              className="nav-link"
              href={item.href}
              key={`${item.href}-${item.label}-mobile`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link className="button-secondary mobile-menu-action" href={actionHref} onClick={() => setMenuOpen(false)}>
          {actionLabel}
        </Link>
      </div>
    </nav>
  );
}
