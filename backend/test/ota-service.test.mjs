import test from "node:test";
import assert from "node:assert/strict";
import { resolveOtaManifest } from "../src/ota/service.mjs";

const config = {
  otaReleasesPath: "ops/ota-releases.json",
  otaReleaseChannel: "stable"
};

test("resolveOtaManifest returns update when newer release exists", () => {
  const result = resolveOtaManifest(config, {
    deviceId: "sb00-devkit-01",
    currentVersion: "0.1.0",
    batteryVariant: "standard"
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "update_available");
  assert.equal(result.result.updateAvailable, true);
});

test("resolveOtaManifest returns up_to_date when already on latest stable release", () => {
  const result = resolveOtaManifest(config, {
    deviceId: "sb00-devkit-01",
    currentVersion: "0.1.3",
    batteryVariant: "standard"
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "up_to_date");
  assert.equal(result.result.updateAvailable, false);
});
