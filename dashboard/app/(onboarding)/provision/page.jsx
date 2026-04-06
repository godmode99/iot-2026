import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function ProvisionPage() {
  const messages = await getMessages();

  return (
    <main className="page-shell placeholder-layout">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>{t(messages, "brand.name")}</span>
      </Link>
      <section className="card">
        <p className="eyebrow">QR + Web/PWA</p>
        <h1 className="page-title">{t(messages, "placeholder.provisionTitle")}</h1>
        <p className="lede">{t(messages, "placeholder.provisionBody")}</p>
        <Link className="button-secondary" href="/dashboard">{t(messages, "nav.dashboard")}</Link>
      </section>
    </main>
  );
}

