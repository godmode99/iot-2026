import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

async function readJsonFile(path) {
  const module = await import(`file:///${path.replaceAll("\\", "/")}`, {
    with: { type: "json" }
  });
  return module.default;
}

function toDurationHours(seconds) {
  return seconds / 3600;
}

function estimateScenario({
  intervalSeconds,
  usableCapacityMah,
  targetDays,
  measurement,
  label
}) {
  const phases = measurement.phases;
  const activeMah =
    (phases.boot.current_ma * toDurationHours(phases.boot.duration_sec)) +
    (phases.sensor.current_ma * toDurationHours(phases.sensor.duration_sec)) +
    (phases.network_attach.current_ma * toDurationHours(phases.network_attach.duration_sec)) +
    (phases.publish.current_ma * toDurationHours(phases.publish.duration_sec));

  const activeDurationSec =
    phases.boot.duration_sec +
    phases.sensor.duration_sec +
    phases.network_attach.duration_sec +
    phases.publish.duration_sec;

  const sleepDurationSec = Math.max(intervalSeconds - activeDurationSec, 0);
  const sleepMah = phases.sleep.current_ma * toDurationHours(sleepDurationSec);
  const cycleMah = activeMah + sleepMah;
  const cyclesPerDay = 86400 / intervalSeconds;
  const reconnectPenaltyMahPerDay = measurement.overrides?.reconnect_penalty_mah_per_day ?? 0;
  const rebootPenaltyMahPerDay = measurement.overrides?.reboot_penalty_mah_per_day ?? 0;
  const dailyMah = cycleMah * cyclesPerDay + reconnectPenaltyMahPerDay + rebootPenaltyMahPerDay;
  const runtimeDays = usableCapacityMah / Math.max(dailyMah, 0.0001);
  const gapDays = runtimeDays - targetDays;
  const ratio = runtimeDays / targetDays;

  let category = "misses target materially";
  if (ratio >= 1) {
    category = "meets target";
  } else if (ratio >= 0.85) {
    category = "near target with optimization required";
  }

  return {
    label,
    interval_seconds: intervalSeconds,
    usable_capacity_mah: usableCapacityMah,
    target_days: targetDays,
    active_duration_sec: activeDurationSec,
    sleep_duration_sec: sleepDurationSec,
    active_mah_per_cycle: Number(activeMah.toFixed(4)),
    sleep_mah_per_cycle: Number(sleepMah.toFixed(4)),
    cycle_mah: Number(cycleMah.toFixed(4)),
    cycles_per_day: Number(cyclesPerDay.toFixed(2)),
    reconnect_penalty_mah_per_day: reconnectPenaltyMahPerDay,
    reboot_penalty_mah_per_day: rebootPenaltyMahPerDay,
    estimated_daily_mah: Number(dailyMah.toFixed(2)),
    estimated_runtime_days: Number(runtimeDays.toFixed(2)),
    target_gap_days: Number(gapDays.toFixed(2)),
    category
  };
}

function renderMarkdown({ measurement, scenarios }) {
  return `# EX-13 Runtime Estimate

- Measurement source: ${measurement.measurement_name}
- Notes: ${measurement.notes || "none"}

## Phase Measurements

| Phase | Current (mA) | Duration (sec) |
| --- | ---: | ---: |
| Boot | ${measurement.phases.boot.current_ma} | ${measurement.phases.boot.duration_sec} |
| Sensor | ${measurement.phases.sensor.current_ma} | ${measurement.phases.sensor.duration_sec} |
| Network Attach | ${measurement.phases.network_attach.current_ma} | ${measurement.phases.network_attach.duration_sec} |
| Publish | ${measurement.phases.publish.current_ma} | ${measurement.phases.publish.duration_sec} |
| Sleep | ${measurement.phases.sleep.current_ma} | variable per interval |

## Scenario Results

| Scenario | Interval (sec) | Daily mAh | Runtime (days) | Target (days) | Category |
| --- | ---: | ---: | ---: | ---: | --- |
${scenarios
  .map(
    (scenario) =>
      `| ${scenario.label} | ${scenario.interval_seconds} | ${scenario.estimated_daily_mah} | ${scenario.estimated_runtime_days} | ${scenario.target_days} | ${scenario.category} |`
  )
  .join("\n")}

## Gap Notes

${scenarios
  .map((scenario) => `- ${scenario.label}: ${scenario.target_gap_days >= 0 ? "ahead" : "behind"} target by ${Math.abs(scenario.target_gap_days)} days`)
  .join("\n")}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(
    process.cwd(),
    args.input ?? "ops/ex13-measurement-template.json"
  );
  const outDir = resolve(
    process.cwd(),
    args["out-dir"] ?? "artifacts/ex13"
  );
  const batteryProfilesPath = resolve(currentDir, "..", "shared", "contracts", "battery-profile.json");

  const [measurement, batteryProfiles] = await Promise.all([
    readJsonFile(inputPath),
    readJsonFile(batteryProfilesPath)
  ]);

  const scenarios = [
    estimateScenario({
      label: "standard @ 5 min",
      intervalSeconds: 300,
      usableCapacityMah: batteryProfiles.standard.usable_capacity_mah,
      targetDays: 12,
      measurement
    }),
    estimateScenario({
      label: "long_life @ 5 min",
      intervalSeconds: 300,
      usableCapacityMah: batteryProfiles.long_life.usable_capacity_mah,
      targetDays: 30,
      measurement
    }),
    estimateScenario({
      label: "long_life @ 10 min",
      intervalSeconds: 600,
      usableCapacityMah: batteryProfiles.long_life.usable_capacity_mah,
      targetDays: 60,
      measurement
    })
  ];

  await mkdir(outDir, { recursive: true });

  const summary = {
    measurement,
    scenarios
  };

  await writeFile(resolve(outDir, "runtime-estimate.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "runtime-estimate.md"), renderMarkdown(summary), "utf8");

  console.log(JSON.stringify({ ok: true, outDir, scenarios }, null, 2));
}

main().catch((error) => {
  console.error("[ex13-runtime-report] failed", error);
  process.exitCode = 1;
});
