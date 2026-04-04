import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let profiles;

export function getBatteryProfiles() {
  if (profiles) {
    return profiles;
  }

  const batteryProfilePath = resolve(process.cwd(), "..", "shared", "contracts", "battery-profile.json");
  profiles = JSON.parse(readFileSync(batteryProfilePath, "utf8"));
  return profiles;
}

export function getBatteryThresholds(variant) {
  const allProfiles = getBatteryProfiles();
  return allProfiles[variant] ?? allProfiles.standard;
}
