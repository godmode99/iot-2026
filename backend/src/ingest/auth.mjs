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

export function authorizeIngestRequest(config, headers) {
  const sharedToken = config.ingestSharedToken?.trim() ?? "";
  const authorizationHeader = readHeader(headers, "authorization");
  const explicitToken = readHeader(headers, "x-ingest-token");
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;
  const suppliedToken = explicitToken || bearerToken || "";

  if (sharedToken) {
    if (!suppliedToken) {
      return {
        ok: false,
        statusCode: 401,
        code: "ingest_auth_missing",
        details: ["Provide Authorization: Bearer <token> or x-ingest-token"]
      };
    }

    if (suppliedToken !== sharedToken) {
      return {
        ok: false,
        statusCode: 403,
        code: "ingest_auth_invalid",
        details: ["token_mismatch"]
      };
    }

    return {
      ok: true,
      mode: "shared_token"
    };
  }

  if (config.values.NODE_ENV === "production" || !config.ingestAllowInsecureDev) {
    return {
      ok: false,
      statusCode: 500,
      code: "ingest_auth_unconfigured",
      details: ["INGEST_SHARED_TOKEN is required for production-like environments"]
    };
  }

  return {
    ok: true,
    mode: "insecure_dev"
  };
}
