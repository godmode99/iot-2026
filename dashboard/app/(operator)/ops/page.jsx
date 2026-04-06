import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function OpsPage() {
  const messages = await getMessages();

  return (
    <main className="page-shell placeholder-layout">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>{t(messages, "brand.name")}</span>
      </Link>
      <section className="card">
        <p className="eyebrow">Operator console</p>
        <h1 className="page-title">{t(messages, "placeholder.opsTitle")}</h1>
        <p className="lede">{t(messages, "placeholder.opsBody")}</p>
        <Link className="button-secondary" href="/dashboard">{t(messages, "nav.dashboard")}</Link>
      </section>
    </main>
  );
}

