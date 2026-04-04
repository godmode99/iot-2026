import postgres from "postgres";
import { getBackendConfig } from "./config.mjs";

let sqlInstance;

export function getDb() {
  if (sqlInstance) {
    return sqlInstance;
  }

  const config = getBackendConfig();
  sqlInstance = postgres(config.values.SUPABASE_DB_URL, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10
  });
  return sqlInstance;
}
