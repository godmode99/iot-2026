import test from "node:test";
import assert from "node:assert/strict";
import { authorizeAdminRequest, authorizeTrustedActorHeader } from "../src/admin/auth.mjs";

function makeConfig(overrides = {}) {
  return {
    adminApiToken: "",
    adminAllowInsecureDev: true,
    values: {
      NODE_ENV: "development"
    },
    ...overrides
  };
}

test("authorizeAdminRequest accepts admin bearer token", () => {
  const result = authorizeAdminRequest(makeConfig({ adminApiToken: "secret-admin" }), {
    authorization: "Bearer secret-admin",
    "x-actor-user-id": "11111111-1111-1111-1111-111111111111"
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "admin_token");
  assert.equal(result.actorUserId, "11111111-1111-1111-1111-111111111111");
});

test("authorizeAdminRequest allows insecure dev actor fallback", () => {
  const result = authorizeAdminRequest(makeConfig(), {
    "x-actor-user-id": "11111111-1111-1111-1111-111111111111"
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "insecure_dev_actor");
});

test("authorizeAdminRequest rejects missing admin auth in production mode", () => {
  const result = authorizeAdminRequest({
    adminApiToken: "",
    adminAllowInsecureDev: false,
    values: {
      NODE_ENV: "production"
    }
  }, {});
  assert.equal(result.ok, false);
  assert.equal(result.code, "admin_auth_unconfigured");
});

test("authorizeTrustedActorHeader accepts token backed actor header", () => {
  const result = authorizeTrustedActorHeader(makeConfig({ adminApiToken: "secret-admin" }), {
    "x-admin-token": "secret-admin",
    "x-actor-user-id": "11111111-1111-1111-1111-111111111111"
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "trusted_internal_token");
  assert.equal(result.actorUserId, "11111111-1111-1111-1111-111111111111");
});

test("authorizeTrustedActorHeader rejects missing actor when token is present", () => {
  const result = authorizeTrustedActorHeader(makeConfig({ adminApiToken: "secret-admin" }), {
    "x-admin-token": "secret-admin"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "actor_missing");
});
