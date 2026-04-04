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
  MQTT_TOPIC_PREFIX: "sb00/devices"
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
    values,
    missing
  };
}

