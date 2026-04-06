const PLACEHOLDER_VALUES = new Set(["", "replace-me", "https://your-project.supabase.co"]);

export function getPublicSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ""
  };
}

export function hasPublicSupabaseConfig() {
  const { url, anonKey } = getPublicSupabaseConfig();
  return !PLACEHOLDER_VALUES.has(url) && !PLACEHOLDER_VALUES.has(anonKey);
}

export function getDefaultLocale() {
  return process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "th";
}

export function getAppUrl() {
  return process.env.DASHBOARD_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

