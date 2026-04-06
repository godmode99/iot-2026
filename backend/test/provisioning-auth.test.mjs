import test from "node:test";
import assert from "node:assert/strict";
import { resolveProvisioningActor } from "../src/provisioning/auth.mjs";

function makeConfig(overrides = {}) {
  return {
    provisioningAllowInsecureDev: true,
    values: {
      NODE_ENV: "development"
    },
    ...overrides
  };
}

test("resolveProvisioningActor allows insecure dev actor fallback", () => {
  const result = resolveProvisioningActor(makeConfig(), "11111111-1111-1111-1111-111111111111", {});
  assert.equal(result.ok, true);
  assert.equal(result.mode, "insecure_dev");
});

test("resolveProvisioningActor prefers trusted header", () => {
  const result = resolveProvisioningActor(makeConfig(), "dev-body-actor", {
    "x-actor-user-id": "header-actor"
  });
  assert.equal(result.ok, true);
  assert.equal(result.actorUserId, "header-actor");
  assert.equal(result.mode, "trusted_header");
});

test("resolveProvisioningActor accepts trusted header with internal token", () => {
  const result = resolveProvisioningActor({
    provisioningAllowInsecureDev: false,
    adminAllowInsecureDev: false,
    adminApiToken: "secret-admin",
    values: {
      NODE_ENV: "production"
    }
  }, null, {
    "x-actor-user-id": "header-actor",
    "x-admin-token": "secret-admin"
  });

  assert.equal(result.ok, true);
  assert.equal(result.actorUserId, "header-actor");
  assert.equal(result.mode, "trusted_internal_token");
});

test("resolveProvisioningActor rejects untrusted actor outside dev", () => {
  const result = resolveProvisioningActor({
    provisioningAllowInsecureDev: false,
    values: {
      NODE_ENV: "production"
    }
  }, "11111111-1111-1111-1111-111111111111", {});
  assert.equal(result.ok, false);
  assert.equal(result.code, "actor_untrusted");
  assert.equal(result.statusCode, 403);
});
