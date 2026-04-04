import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

function summarizeDailyChecks(days) {
  return days.map((day) => {
    const issueCount = (day.issues ?? []).length;
    return {
      day: day.day,
      telemetry_ok: day.telemetry_ok,
      online_state_ok: day.online_state_ok,
      battery_trend_ok: day.battery_trend_ok,
      alert_noise_ok: day.alert_noise_ok,
      issue_count: issueCount
    };
  });
}

function computePassConclusion(data) {
  const failedDays = data.daily_checks.filter(
    (day) => !day.telemetry_ok || !day.online_state_ok || !day.battery_trend_ok
  );

  const majorIssues = data.daily_checks.flatMap((day) =>
    (day.issues ?? []).filter((issue) => issue.severity === "critical")
  );

  const pass =
    failedDays.length <= 1 &&
    majorIssues.length === 0 &&
    data.summary.runtime_behavior !== "bad" &&
    data.summary.connectivity_behavior !== "bad" &&
    data.summary.sensor_behavior !== "bad";

  return {
    pass,
    failed_day_count: failedDays.length,
    critical_issue_count: majorIssues.length,
    category: pass ? "pass_with_action_items" : "fail_requires_fix_before_next_stage"
  };
}

function renderMarkdown(data, conclusion, summaries) {
  return `# EX-15 Seven-Day Field Report

## Setup Summary

- Device ID: ${data.setup.device_id}
- Serial Number: ${data.setup.serial_number}
- Battery Variant: ${data.setup.battery_variant}
- Interval Profile: ${data.setup.interval_profile}
- Deployment Site: ${data.setup.deployment_site}
- Start: ${data.setup.start_at}
- End: ${data.setup.end_at}

## Daily Checks

| Day | Telemetry | Online | Battery | Alert Noise | Issue Count |
| --- | --- | --- | --- | --- | ---: |
${summaries
  .map(
    (day) =>
      `| ${day.day} | ${day.telemetry_ok ? "ok" : "fail"} | ${day.online_state_ok ? "ok" : "fail"} | ${day.battery_trend_ok ? "ok" : "fail"} | ${day.alert_noise_ok ? "ok" : "fail"} | ${day.issue_count} |`
  )
  .join("\n")}

## Evidence Summary

- Runtime behavior: ${data.summary.runtime_behavior}
- Connectivity behavior: ${data.summary.connectivity_behavior}
- GPS behavior: ${data.summary.gps_behavior}
- Sensor behavior: ${data.summary.sensor_behavior}
- Alerts usefulness: ${data.summary.alert_usefulness}

## Conclusion

- Result: ${conclusion.pass ? "PASS" : "FAIL"}
- Category: ${conclusion.category}
- Failed day count: ${conclusion.failed_day_count}
- Critical issue count: ${conclusion.critical_issue_count}

## Next Actions

${data.next_actions.length ? data.next_actions.map((action) => `- ${action}`).join("\n") : "- none"}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input ?? "ops/ex15-observation-template.json");
  const outDir = resolve(process.cwd(), args["out-dir"] ?? "artifacts/ex15");
  const data = await readJsonFile(inputPath);
  const summaries = summarizeDailyChecks(data.daily_checks);
  const conclusion = computePassConclusion(data);
  const report = {
    setup: data.setup,
    summary: data.summary,
    daily_checks: summaries,
    conclusion,
    next_actions: data.next_actions
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "field-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "field-report.md"), renderMarkdown(data, conclusion, summaries), "utf8");

  console.log(JSON.stringify({ ok: true, outDir, conclusion }, null, 2));
}

main().catch((error) => {
  console.error("[ex15-field-report] failed", error);
  process.exitCode = 1;
});
