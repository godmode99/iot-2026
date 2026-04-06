const requiredEnv = [
  "NODE_ENV",
  "APP_URL",
  "BACKEND_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "MQTT_BROKER_URL",
  "MQTT_USERNAME",
  "MQTT_PASSWORD",
  "MQTT_TOPIC_PREFIX",
  "JWT_SECRET"
];

const defaults = {
  NODE_ENV: "development",
  APP_URL: "http://localhost:3000",
  BACKEND_URL: "http://localhost:3100",
  MQTT_TOPIC_PREFIX: "sb00/devices",
  INGEST_ALLOW_INSECURE_DEV: "true",
  BACKEND_REQUEST_LOGGING: "true",
  PROVISIONING_ALLOW_INSECURE_DEV: "true",
  ALERT_NOTIFY_MIN_INTERVAL_SEC: "900",
  NOTIFICATION_MODE: "stub",
  ALERT_EMAIL_TO: "",
  ALERT_LINE_USER_ID: "",
  ADMIN_ALLOW_INSECURE_DEV: "true",
  OTA_RELEASES_PATH: "ops/ota-releases.json",
  OTA_RELEASE_CHANNEL: "stable",
  BACKEND_RATE_LIMIT_ENABLED: "true"
};

export function getBackendConfig() {
  const values = {};
  const missing = [];

  for (const key of requiredEnv) {
    const value = process.env[key] ?? defaults[key] ?? "";
    values[key] = value;
    if (!value) {
      missing.push(key);
    }
  }

  return {
    port: Number(process.env.BACKEND_PORT ?? 3100),
    ingestSharedToken: process.env.INGEST_SHARED_TOKEN ?? "",
    ingestAllowInsecureDev: (process.env.INGEST_ALLOW_INSECURE_DEV ?? defaults.INGEST_ALLOW_INSECURE_DEV) === "true",
    provisioningAllowInsecureDev:
      (process.env.PROVISIONING_ALLOW_INSECURE_DEV ?? defaults.PROVISIONING_ALLOW_INSECURE_DEV) === "true",
    alertNotifyMinIntervalSec: Number(process.env.ALERT_NOTIFY_MIN_INTERVAL_SEC ?? defaults.ALERT_NOTIFY_MIN_INTERVAL_SEC),
    notificationMode: process.env.NOTIFICATION_MODE ?? defaults.NOTIFICATION_MODE,
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
    alertEmailTo: process.env.ALERT_EMAIL_TO ?? defaults.ALERT_EMAIL_TO,
    alertLineUserId: process.env.ALERT_LINE_USER_ID ?? defaults.ALERT_LINE_USER_ID,
    adminApiToken: process.env.ADMIN_API_TOKEN ?? "",
    adminAllowInsecureDev: (process.env.ADMIN_ALLOW_INSECURE_DEV ?? defaults.ADMIN_ALLOW_INSECURE_DEV) === "true",
    otaReleasesPath: process.env.OTA_RELEASES_PATH ?? defaults.OTA_RELEASES_PATH,
    otaReleaseChannel: process.env.OTA_RELEASE_CHANNEL ?? defaults.OTA_RELEASE_CHANNEL,
    rateLimitEnabled: (process.env.BACKEND_RATE_LIMIT_ENABLED ?? defaults.BACKEND_RATE_LIMIT_ENABLED) === "true",
    requestLoggingEnabled: (process.env.BACKEND_REQUEST_LOGGING ?? defaults.BACKEND_REQUEST_LOGGING) === "true",
    values,
    missing
  };
}
