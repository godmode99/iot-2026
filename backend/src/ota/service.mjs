import { readFileSync } from "node:fs";
import { resolve, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function compareVersions(left, right) {
  const leftParts = String(left ?? "0").split(".").map((value) => Number.parseInt(value, 10) || 0);
  const rightParts = String(right ?? "0").split(".").map((value) => Number.parseInt(value, 10) || 0);
  const count = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < count; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

function loadReleaseCatalog(config) {
  const catalogPath = isAbsolute(config.otaReleasesPath)
    ? config.otaReleasesPath
    : resolve(currentDir, "..", "..", "..", config.otaReleasesPath);
  return JSON.parse(readFileSync(catalogPath, "utf8"));
}

function pickRelease(releases, { currentVersion, channel, batteryVariant }) {
  return releases
    .filter((release) => (channel ? release.channel === channel : true))
    .filter((release) => !release.battery_variants || release.battery_variants.includes(batteryVariant))
    .filter((release) => compareVersions(release.version, currentVersion) > 0)
    .sort((left, right) => compareVersions(right.version, left.version))[0] ?? null;
}

export function resolveOtaManifest(config, input) {
  const deviceId = String(input.deviceId ?? "").trim();
  const currentVersion = String(input.currentVersion ?? "").trim();
  const batteryVariant = String(input.batteryVariant ?? "standard").trim() || "standard";
  const channel = String(input.channel ?? config.otaReleaseChannel ?? "stable").trim() || "stable";

  if (!deviceId) {
    return {
      ok: false,
      statusCode: 400,
      code: "device_id_missing",
      details: ["device_id is required"]
    };
  }

  if (!currentVersion) {
    return {
      ok: false,
      statusCode: 400,
      code: "current_version_missing",
      details: ["current_version is required"]
    };
  }

  const catalog = loadReleaseCatalog(config);
  const release = pickRelease(catalog.releases ?? [], { currentVersion, channel, batteryVariant });

  if (!release) {
    return {
      ok: true,
      statusCode: 200,
      code: "up_to_date",
      result: {
        deviceId,
        channel,
        currentVersion,
        updateAvailable: false
      }
    };
  }

  return {
    ok: true,
    statusCode: 200,
    code: "update_available",
    result: {
      deviceId,
      channel,
      currentVersion,
      updateAvailable: true,
      manifest: {
        version: release.version,
        channel: release.channel,
        url: release.url,
        sha256: release.sha256,
        notes: release.notes ?? "",
        minBatteryPercent: release.min_battery_percent ?? 20,
        rollout: release.rollout ?? "manual",
        signed: Boolean(release.sha256)
      }
    }
  };
}
