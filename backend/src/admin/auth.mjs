function readHeader(headers, headerName) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const direct = headers[headerName];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const lower = headers[headerName.toLowerCase()];
  if (typeof lower === "string" && lower.trim()) {
    return lower.trim();
  }

  return null;
}

function extractSuppliedToken(headers) {
  const authorizationHeader = readHeader(headers, "authorization");
  const explicitToken = readHeader(headers, "x-admin-token");
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;

  return explicitToken || bearerToken || "";
}

export function authorizeAdminRequest(config, headers) {
  const devActor = readHeader(headers, "x-actor-user-id");
  const suppliedToken = extractSuppliedToken(headers);

  if (config.adminApiToken) {
    if (!suppliedToken) {
      return {
        ok: false,
        statusCode: 401,
        code: "admin_auth_missing",
        details: ["Provide Authorization: Bearer <token> or x-admin-token"]
      };
    }

    if (suppliedToken !== config.adminApiToken) {
      return {
        ok: false,
        statusCode: 403,
        code: "admin_auth_invalid",
        details: ["token_mismatch"]
      };
    }

    return {
      ok: true,
      mode: "admin_token",
      actorUserId: devActor ?? null
    };
  }

  if (config.values.NODE_ENV !== "production" && config.adminAllowInsecureDev && devActor) {
    return {
      ok: true,
      mode: "insecure_dev_actor",
      actorUserId: devActor
    };
  }

  return {
    ok: false,
    statusCode: 500,
    code: "admin_auth_unconfigured",
    details: ["Set ADMIN_API_TOKEN or provide x-actor-user-id in local development"]
  };
}

export function authorizeTrustedActorHeader(config, headers) {
  const actorUserId = readHeader(headers, "x-actor-user-id");
  const suppliedToken = extractSuppliedToken(headers);

  if (config.adminApiToken) {
    if (!suppliedToken) {
      return {
        ok: false,
        statusCode: 401,
        code: "trusted_actor_auth_missing",
        details: ["Provide Authorization: Bearer <token> or x-admin-token"]
      };
    }

    if (suppliedToken !== config.adminApiToken) {
      return {
        ok: false,
        statusCode: 403,
        code: "trusted_actor_auth_invalid",
        details: ["token_mismatch"]
      };
    }

    if (!actorUserId) {
      return {
        ok: false,
        statusCode: 401,
        code: "actor_missing",
        details: ["Provide x-actor-user-id with trusted internal token"]
      };
    }

    return {
      ok: true,
      actorUserId,
      mode: "trusted_internal_token"
    };
  }

  if (config.values.NODE_ENV !== "production" && config.adminAllowInsecureDev && actorUserId) {
    return {
      ok: true,
      actorUserId,
      mode: "insecure_dev_actor"
    };
  }

  return {
    ok: false,
    statusCode: actorUserId ? 403 : 401,
    code: actorUserId ? "actor_untrusted" : "actor_missing",
    details: actorUserId
      ? ["Set ADMIN_API_TOKEN before trusting x-actor-user-id outside local development"]
      : ["Provide x-actor-user-id or enable insecure dev admin actor fallback"]
  };
}
