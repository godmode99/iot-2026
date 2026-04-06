import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TEMPLATE_FILE = ".env.staging.example";
const OUTPUT_FILE = ".env.staging.local";
const GENERATED_KEYS = new Set([
  "ADMIN_API_TOKEN",
  "INGEST_SHARED_TOKEN",
  "JWT_SECRET"
]);

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force")
  };
}

function generateSecret() {
  return randomBytes(48).toString("base64url");
}

function replaceGeneratedSecrets(text) {
  let generatedCount = 0;

  const lines = text.split(/\r?\n/).map((line) => {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) {
      return line;
    }

    const equalsAt = line.indexOf("=");
    const key = line.slice(0, equalsAt).trim();
    if (!GENERATED_KEYS.has(key)) {
      return line;
    }

    generatedCount += 1;
    return `${key}=${generateSecret()}`;
  });

  return {
    generatedCount,
    text: lines.join("\n")
  };
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const templatePath = resolve(process.cwd(), TEMPLATE_FILE);
  const outputPath = resolve(process.cwd(), OUTPUT_FILE);

  if (!existsSync(templatePath)) {
    throw new Error(`Missing template: ${templatePath}`);
  }

  if (existsSync(outputPath) && !args.force) {
    console.error(`[env:init:staging] ${OUTPUT_FILE} already exists. Use --force to overwrite.`);
    process.exitCode = 1;
    return;
  }

  const template = readFileSync(templatePath, "utf8");
  const result = replaceGeneratedSecrets(template);

  if (args.dryRun) {
    console.log(`[env:init:staging] would write ${OUTPUT_FILE} with ${result.generatedCount} generated local secrets`);
    return;
  }

  writeFileSync(outputPath, `${result.text.trimEnd()}\n`, "utf8");
  console.log(`[env:init:staging] wrote ${OUTPUT_FILE} with ${result.generatedCount} generated local secrets`);
  console.log("[env:init:staging] fill Supabase, URL, MQTT, notification, and OTA values before running deploy:check:staging");
}

run();
