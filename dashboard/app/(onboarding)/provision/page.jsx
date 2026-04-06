import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { resolveProvisioningTarget } from "@/lib/backend/provisioning.js";
import { bindDeviceToSelectedFarm } from "./actions.js";

export const dynamic = "force-dynamic";

function provisioningStateLabel(state) {
  if (state === "already_bound") {
    return "Already bound";
  }
  if (state === "valid_unbound") {
    return "Ready to bind";
  }
  return "Scan or paste QR";
}

async function safeResolveProvisioningTarget({ qr, actorUserId }) {
  try {
    return await resolveProvisioningTarget({ qr, actorUserId });
  } catch (error) {
    return {
      ok: false,
      code: "provisioning_backend_unavailable",
      details: [error instanceof Error ? error.message : "unknown_error"]
    };
  }
}

export default async function ProvisionPage({ searchParams }) {
  const messages = await getMessages();
  const params = await searchParams;
  const qr = typeof params?.qr === "string" ? params.qr.trim() : "";
  const bound = typeof params?.bound === "string" ? params.bound : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const returnUrl = qr ? `/provision?qr=${encodeURIComponent(qr)}` : "/provision";
  const { authConfigured, user } = await requireUser({ returnUrl });
  const resolved = qr && user ? await safeResolveProvisioningTarget({ qr, actorUserId: user.id }) : null;
  const device = resolved?.result?.device ?? null;
  const farms = resolved?.result?.farms ?? [];
  const state = bound ? "success" : resolved?.result?.state ?? "idle";
  const canBind = Boolean(user && device && resolved?.result?.state === "valid_unbound" && farms.length > 0);

  return (
    <AppShell currentPath="/provision" ariaLabel="Provisioning navigation" className="page-shell placeholder-layout">
      <section className="card">
        <p className="eyebrow">QR + Web/PWA</p>
        <h1 className="page-title">{t(messages, "placeholder.provisionTitle")}</h1>
        <p className="lede">{t(messages, "placeholder.provisionBody")}</p>
      </section>

      {!authConfigured ? (
        <section className="notice">{t(messages, "dashboard.authPending")}</section>
      ) : null}

      <section className="card">
        <form className="form" action="/provision" method="get">
          <label>
            {t(messages, "provision.qrLabel")}
            <input name="qr" defaultValue={qr} placeholder="sb00-devkit-02 or QR URL" />
          </label>
          <button className="button" type="submit">{t(messages, "provision.resolveAction")}</button>
        </form>
      </section>

      {error ? <section className="notice">Provisioning error: {error}</section> : null}
      {bound ? <section className="notice">Provisioning result: {bound}</section> : null}

      <section className="card">
        <p className="eyebrow">{t(messages, "provision.state")}</p>
        <h2>{provisioningStateLabel(state)}</h2>
        {resolved && !resolved.ok ? (
          <p className="muted">{resolved.code}</p>
        ) : (
          <p className="muted">{t(messages, "provision.stateBody")}</p>
        )}
      </section>

      {device ? (
        <section className="card">
          <p className="eyebrow">{t(messages, "provision.resolvedDevice")}</p>
          <h2>{device.serial_number || device.device_id}</h2>
          <p className="muted">
            {device.device_id} / {device.provisioning_state} / {device.farm_name || "Unbound"}
          </p>
        </section>
      ) : null}

      {canBind ? (
        <section className="card">
          <form className="form" action={bindDeviceToSelectedFarm}>
            <input type="hidden" name="qr" value={qr} />
            <label>
              {t(messages, "provision.chooseFarm")}
              <select name="farm_id" required>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">{t(messages, "provision.bindAction")}</button>
          </form>
        </section>
      ) : null}

      {device && resolved?.result?.state === "valid_unbound" && !farms.length ? (
        <section className="notice">{t(messages, "provision.noOwnedFarms")}</section>
      ) : null}
    </AppShell>
  );
}
