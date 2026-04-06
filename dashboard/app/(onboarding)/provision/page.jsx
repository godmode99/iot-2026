import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { resolveProvisioningTarget } from "@/lib/backend/provisioning.js";
import { bindDeviceToSelectedFarm } from "./actions.js";

export const dynamic = "force-dynamic";

const PROVISION_STEPS = ["scan", "confirm", "farm", "bind"];

function provisioningStateLabel(state) {
  if (state === "already_bound") {
    return "Already bound";
  }
  if (state === "valid_unbound") {
    return "Ready to bind";
  }
  if (state === "success") {
    return "Device bound";
  }
  if (state === "idle") {
    return "Scan or paste QR";
  }
  return "Scan or paste QR";
}

function provisioningStateClass(state) {
  if (state === "success" || state === "valid_unbound") {
    return "is-online";
  }
  if (state === "already_bound") {
    return "is-stale";
  }
  return "";
}

function farmPanelMessage({ qr, device, state, messages }) {
  if (!qr) {
    return t(messages, "provision.startWithQr", "Paste the QR payload or device ID to continue.");
  }
  if (device && state === "valid_unbound") {
    return t(messages, "provision.noOwnedFarms");
  }
  if (device && state === "already_bound") {
    return t(messages, "provision.alreadyBoundBody", "This device is already bound to a farm.");
  }

  return t(messages, "provision.resolveFirst", "Resolve the device before choosing a farm.");
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
      {!authConfigured ? (
        <section className="notice">{t(messages, "dashboard.authPending")}</section>
      ) : null}

      {error ? <section className="notice">Provisioning error: {error}</section> : null}
      {bound ? <section className="notice">Provisioning result: {bound}</section> : null}

      <section className="provision-hero">
        <div className="provision-hero-copy">
          <span className={`pill ${provisioningStateClass(state)}`}>{provisioningStateLabel(state)}</span>
          <p className="eyebrow">QR + Web/PWA</p>
          <h1 className="page-title">{t(messages, "placeholder.provisionTitle")}</h1>
          <p className="lede">{t(messages, "placeholder.provisionBody")}</p>
        </div>

        <form className="form provision-resolve-form" action="/provision" method="get">
          <label>
            {t(messages, "provision.qrLabel")}
            <input
              name="qr"
              defaultValue={qr}
              inputMode="text"
              autoComplete="off"
              placeholder="sb00-devkit-02 or QR URL"
            />
          </label>
          <button className="button" type="submit">{t(messages, "provision.resolveAction")}</button>
        </form>
      </section>

      <section className="provision-steps" aria-label="Provisioning steps">
        {PROVISION_STEPS.map((step, index) => (
          <div className="provision-step" key={step}>
            <span>{index + 1}</span>
            <strong>{t(messages, `provision.steps.${step}`, step)}</strong>
          </div>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card provision-status-card">
          <p className="eyebrow">{t(messages, "provision.state")}</p>
          <h2>{provisioningStateLabel(state)}</h2>
          {resolved && !resolved.ok ? (
            <p className="muted">{resolved.code}</p>
          ) : (
            <p className="muted">{t(messages, "provision.stateBody")}</p>
          )}
          {device ? (
            <div className="provision-device-summary">
              <span className="muted">{t(messages, "provision.resolvedDevice")}</span>
              <strong>{device.serial_number || device.device_id}</strong>
              <span className="muted">
                {device.device_id} / {device.provisioning_state} / {device.farm_name || "Unbound"}
              </span>
            </div>
          ) : null}
        </article>

        <article className="card provision-status-card">
          <p className="eyebrow">{t(messages, "provision.chooseFarm")}</p>
          {canBind ? (
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
          ) : (
            <div className="provision-empty-action">
              <p className="muted">{farmPanelMessage({ qr, device, state, messages })}</p>
              {device && state === "valid_unbound" ? (
                <Link className="button-secondary" href="/farms/new">{t(messages, "farmCreate.createAction")}</Link>
              ) : null}
            </div>
          )}
        </article>
      </section>

      {device && resolved?.result?.state === "valid_unbound" && !farms.length ? (
        <section className="notice">{t(messages, "provision.noOwnedFarms")}</section>
      ) : null}
    </AppShell>
  );
}
