import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^replace-me$/i,
  /replace-me/i,
  /^your-/i,
  /your-/i,
  /your-project/i,
  /example\.com/i,
  /^postgresql:\/\/postgres:postgres@localhost/i
];

const REQUIRED_KEYS = [
  "APP_URL",
  "DASHBOARD_URL",
  "BACKEND_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "ADMIN_API_TOKEN",
  "INGEST_SHARED_TOKEN",
  "MQTT_BROKER_URL",
  "MQTT_USERNAME",
  "MQTT_PASSWORD",
  "MQTT_TOPIC_PREFIX",
  "JWT_SECRET"
];

const PRODUCTION_FALSE_FLAGS = [
  "ADMIN_ALLOW_INSECURE_DEV",
  "DASHBOARD_ALLOW_ACTOR_OVERRIDE",
  "INGEST_ALLOW_INSECURE_DEV",
  "PROVISIONING_ALLOW_INSECURE_DEV"
];

const HTTPS_KEYS = [
  "APP_URL",
  "DASHBOARD_URL",
  "BACKEND_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL"
];

const SECRET_KEY_PATTERNS = [
  /ADMIN.*TOKEN/i,
  /SERVICE_ROLE/i,
  /SECRET/i,
  /PASSWORD/i,
  /SIGNING/i
];

function parseArgs(argv) {
  const args = {
    envFile: ".env",
    target: "local"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--env") {
      args.envFile = argv[index + 1] ?? args.envFile;
      index += 1;
    } else if (item === "--target") {
      args.target = argv[index + 1] ?? args.target;
      index += 1;
    }
  }

  if (!["local", "preview", "staging", "production", "template"].includes(args.target)) {
    throw new Error(`Unsupported --target ${args.target}. Use local, preview, staging, production, or template.`);
  }

  return args;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) {
      continue;
    }

    const key = line.slice(0, equalsAt).trim();
    const rawValue = line.slice(equalsAt + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function valueFor(env, key) {
  return process.env[key] ?? env[key] ?? "";
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(String(value ?? "")));
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const envPath = resolve(process.cwd(), args.envFile);
  const fileEnv = parseEnvFile(envPath);
  const errors = [];
  const warnings = [];

  if (!existsSync(envPath) && !["staging", "production"].includes(args.target)) {
    warnings.push(`Env file not found: ${envPath}. Falling back to process.env only.`);
  }

  for (const key of REQUIRED_KEYS) {
    const value = valueFor(fileEnv, key);
    if (!value) {
      errors.push(`Missing required env: ${key}`);
      continue;
    }

    if (args.target !== "template" && isPlaceholder(value)) {
      errors.push(`Replace placeholder value for ${key}`);
    }
  }

  for (const key of Object.keys(fileEnv)) {
    if (!key.startsWith("NEXT_PUBLIC_")) {
      continue;
    }

    if (SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      errors.push(`Public browser env must not contain secret-like key: ${key}`);
    }
  }

  if (["staging", "production"].includes(args.target)) {
    for (const key of PRODUCTION_FALSE_FLAGS) {
      if (valueFor(fileEnv, key) !== "false") {
        errors.push(`${key} must be false for ${args.target}`);
      }
    }

    for (const key of HTTPS_KEYS) {
      const value = valueFor(fileEnv, key);
      if (value && !isHttpsUrl(value)) {
        errors.push(`${key} must be an https:// URL for ${args.target}`);
      }
    }

    if (valueFor(fileEnv, "BACKEND_RATE_LIMIT_ENABLED") !== "true") {
      errors.push(`BACKEND_RATE_LIMIT_ENABLED must be true for ${args.target}`);
    }
  }

  if (args.target === "production" && valueFor(fileEnv, "NOTIFICATION_MODE") === "stub") {
    warnings.push("NOTIFICATION_MODE is stub. Production alerts will be audited but not delivered to users.");
  }

  if (args.target === "staging" && valueFor(fileEnv, "NOTIFICATION_MODE") === "stub") {
    warnings.push("NOTIFICATION_MODE is stub. Staging alerts will be audited but not delivered.");
  }

  if (args.target === "staging") {
    for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "ADMIN_API_TOKEN", "INGEST_SHARED_TOKEN", "JWT_SECRET"]) {
      const value = valueFor(fileEnv, key);
      if (value && value.length < 24) {
        errors.push(`${key} should be at least 24 characters for staging`);
      }
    }
  }

  if (!["th", "en", "my"].includes(valueFor(fileEnv, "NEXT_PUBLIC_DEFAULT_LOCALE") || "th")) {
    errors.push("NEXT_PUBLIC_DEFAULT_LOCALE must be one of th, en, or my");
  }

  const summary = {
    target: args.target,
    envFile: envPath,
    errors,
    warnings
  };

  if (warnings.length) {
    console.warn("[deploy-check] warnings", warnings);
  }

  if (errors.length) {
    console.error("[deploy-check] failed", summary);
    process.exitCode = 1;
    return;
  }

  console.log("[deploy-check] passed", summary);
}

run();
