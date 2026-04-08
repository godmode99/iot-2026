import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { normalizeLocale } from "@/lib/i18n.js";

export async function loadAccountSettings() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      authConfigured: false,
      user: null,
      profile: null,
      error: null
    };
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user ?? null;

  if (userError || !user) {
    return {
      authConfigured: true,
      user: null,
      profile: null,
      error: userError?.message ?? null
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_type,display_name,preferred_locale,profile_completed_at,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    authConfigured: true,
    user,
    profile: {
      userType: profile?.user_type ?? "customer",
      displayName: profile?.display_name ?? user.email ?? user.user_metadata?.full_name ?? "",
      preferredLocale: normalizeLocale(profile?.preferred_locale),
      profileCompletedAt: profile?.profile_completed_at ?? null,
      updatedAt: profile?.updated_at ?? null
    },
    error: profileError?.message ?? null
  };
}
