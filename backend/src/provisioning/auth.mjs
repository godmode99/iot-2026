import { authorizeTrustedActorHeader } from "../admin/auth.mjs";

function readHeader(headers, headerName) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const exact = headers[headerName];
  if (typeof exact === "string" && exact.trim()) {
    return exact.trim();
  }

  const lower = headers[headerName.toLowerCase()];
  if (typeof lower === "string" && lower.trim()) {
    return lower.trim();
  }

  return null;
}

export function resolveProvisioningActor(config, explicitActorUserId, headers) {
  const headerActorUserId = readHeader(headers, "x-actor-user-id");
  const actorUserId = headerActorUserId || explicitActorUserId || null;

  if (headerActorUserId) {
    if (!config.adminApiToken && config.values.NODE_ENV !== "production" && config.provisioningAllowInsecureDev) {
      return {
        ok: true,
        actorUserId: headerActorUserId,
        mode: "trusted_header"
      };
    }

    return authorizeTrustedActorHeader(config, headers);
  }

  if (explicitActorUserId && config.values.NODE_ENV !== "production" && config.provisioningAllowInsecureDev) {
    return {
      ok: true,
      actorUserId,
      mode: "insecure_dev"
    };
  }

  if (!actorUserId) {
    return {
      ok: false,
      statusCode: 401,
      code: "actor_missing",
      details: ["Provide x-actor-user-id or enable insecure dev provisioning"]
    };
  }

  return {
    ok: false,
    statusCode: 403,
    code: "actor_untrusted",
    details: ["Use x-actor-user-id outside local development"]
  };
}
