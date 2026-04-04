import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let profiles;
const currentDir = dirname(fileURLToPath(import.meta.url));

export function getBatteryProfiles() {
  if (profiles) {
    return profiles;
  }

  const batteryProfilePath = resolve(currentDir, "..", "..", "..", "shared", "contracts", "battery-profile.json");
  profiles = JSON.parse(readFileSync(batteryProfilePath, "utf8"));
  return profiles;
}

export function getBatteryThresholds(variant) {
  const allProfiles = getBatteryProfiles();
  return allProfiles[variant] ?? allProfiles.standard;
}
