import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "../supabase/server.js";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { authConfigured: false, user: null };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return { authConfigured: true, user: null };
  }

  return { authConfigured: true, user: data.user };
}

export async function requireUser({ returnUrl = "/dashboard" } = {}) {
  if (!hasSupabaseServerConfig()) {
    return { authConfigured: false, user: null };
  }

  const result = await getCurrentUser();

  if (!result.user) {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  return result;
}

