import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const EMPTY_APP_SHELL = {
  userType: "guest",
  displayName: "",
  canAccessOps: false,
  isReseller: false,
  isCustomer: false
};

export async function loadAppShellContext() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_APP_SHELL;
  }

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult?.user ?? null;

  if (!user) {
    return EMPTY_APP_SHELL;
  }

  const [profileResult, operatorResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_type,display_name,preferred_locale,profile_completed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("is_admin_or_operator")
  ]);

  const userType = profileResult.data?.user_type ?? "customer";

  return {
    userType,
    displayName: profileResult.data?.display_name ?? user.email ?? "",
    canAccessOps: operatorResult.data === true,
    isReseller: userType === "reseller",
    isCustomer: userType === "customer",
    email: user.email ?? "",
    profileCompletedAt: profileResult.data?.profile_completed_at ?? null
  };
}
