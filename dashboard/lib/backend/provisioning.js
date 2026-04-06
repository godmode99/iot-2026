import { getBackendServerConfig } from "@/lib/env.js";

function buildTrustedHeaders(actorUserId) {
  const { adminApiToken } = getBackendServerConfig();
  const headers = {
    "x-actor-user-id": actorUserId
  };

  if (adminApiToken) {
    headers.authorization = `Bearer ${adminApiToken}`;
  }

  return headers;
}

async function fetchBackendJson(path, options = {}) {
  const { backendUrl } = getBackendServerConfig();
  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: payload?.code ?? "backend_error",
      details: payload?.details ?? []
    };
  }

  return payload;
}

export async function resolveProvisioningTarget({ qr, actorUserId }) {
  const query = new URLSearchParams({ qr });

  return fetchBackendJson(`/api/provisioning/resolve?${query.toString()}`, {
    headers: buildTrustedHeaders(actorUserId)
  });
}

export async function bindProvisioningTarget({ qr, farmId, actorUserId }) {
  return fetchBackendJson("/api/provisioning/bind", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...buildTrustedHeaders(actorUserId)
    },
    body: JSON.stringify({
      qr,
      farm_id: farmId
    })
  });
}

