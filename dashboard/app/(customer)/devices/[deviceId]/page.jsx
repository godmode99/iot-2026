import Link from "next/link";
import { getMessages, t } from "@/lib/i18n.js";

export default async function DeviceDetailPage({ params }) {
  const messages = await getMessages();
  const { deviceId } = await params;

  return (
    <main className="page-shell placeholder-layout">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>{t(messages, "brand.name")}</span>
      </Link>
      <section className="card">
        <p className="eyebrow">Device {deviceId}</p>
        <h1 className="page-title">{t(messages, "placeholder.deviceTitle")}</h1>
        <p className="lede">{t(messages, "placeholder.deviceBody")}</p>
        <Link className="button-secondary" href="/dashboard">{t(messages, "nav.dashboard")}</Link>
      </section>
    </main>
  );
}

