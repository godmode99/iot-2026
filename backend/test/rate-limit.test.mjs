import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRateLimitConfig,
  createRateLimiter,
  getRateLimitKey,
  selectRateLimitPolicy
} from "../src/rate-limit.mjs";

test("selectRateLimitPolicy applies specific policies to sensitive routes", () => {
  const config = buildRateLimitConfig({
    BACKEND_RATE_LIMIT_ENABLED: "true",
    BACKEND_RATE_LIMIT_ADMIN_MAX: "7",
    BACKEND_RATE_LIMIT_INGEST_MAX: "9"
  });

  assert.equal(selectRateLimitPolicy({
    method: "POST",
    pathname: "/api/ingest/telemetry"
  }, config).bucket, "ingest");
  assert.equal(selectRateLimitPolicy({
    method: "GET",
    pathname: "/api/admin/command-log"
  }, config).max, 7);
  assert.equal(selectRateLimitPolicy({
    method: "GET",
    pathname: "/api/devices"
  }, config), null);
});

test("createRateLimiter rejects requests after max until the window resets", () => {
  let now = 1_000;
  const limiter = createRateLimiter({ now: () => now });
  const policy = { bucket: "admin", max: 2, windowMs: 1_000 };
  const key = getRateLimitKey({
    remoteAddress: "127.0.0.1",
    method: "POST",
    pathname: "/api/admin/devices/demo/commands",
    bucket: policy.bucket
  });

  assert.equal(limiter.check({ key, policy }).allowed, true);
  assert.equal(limiter.check({ key, policy }).allowed, true);
  const rejected = limiter.check({ key, policy });
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfterSec, 1);

  now = 2_001;
  assert.equal(limiter.check({ key, policy }).allowed, true);
});
