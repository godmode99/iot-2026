import { getBackendServerConfig } from "@/lib/env.js";

export function buildTrustedActorHeaders(actorUserId, extraHeaders = {}) {
  const { adminApiToken } = getBackendServerConfig();
  const headers = {
    ...extraHeaders,
    "x-actor-user-id": actorUserId
  };

  if (adminApiToken) {
    headers.authorization = `Bearer ${adminApiToken}`;
  }

  return headers;
}

export async function fetchBackendJson(path, options = {}) {
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

