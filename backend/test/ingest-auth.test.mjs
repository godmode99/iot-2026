import test from "node:test";
import assert from "node:assert/strict";
import { authorizeIngestRequest } from "../src/ingest/auth.mjs";

function makeConfig(overrides = {}) {
  return {
    ingestSharedToken: "",
    ingestAllowInsecureDev: true,
    values: {
      NODE_ENV: "development"
    },
    ...overrides
  };
}

test("authorizeIngestRequest allows insecure development mode by default", () => {
  const result = authorizeIngestRequest(makeConfig(), {});
  assert.equal(result.ok, true);
  assert.equal(result.mode, "insecure_dev");
});

test("authorizeIngestRequest requires token when shared token is configured", () => {
  const result = authorizeIngestRequest(makeConfig({ ingestSharedToken: "secret-token" }), {});
  assert.equal(result.ok, false);
  assert.equal(result.code, "ingest_auth_missing");
  assert.equal(result.statusCode, 401);
});

test("authorizeIngestRequest accepts bearer token", () => {
  const result = authorizeIngestRequest(makeConfig({ ingestSharedToken: "secret-token" }), {
    authorization: "Bearer secret-token"
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "shared_token");
});

test("authorizeIngestRequest rejects missing token in production mode", () => {
  const result = authorizeIngestRequest(makeConfig({
    ingestAllowInsecureDev: false,
    values: {
      NODE_ENV: "production"
    }
  }), {});
  assert.equal(result.ok, false);
  assert.equal(result.code, "ingest_auth_unconfigured");
  assert.equal(result.statusCode, 500);
});
