"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env.js";
import { withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server.js";

export async function requestPasswordReset(formData) {
  if (!hasSupabaseServerConfig()) {
    redirect(withParams("/forgot-password", { error: "auth_not_configured" }));
  }

  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`
  });

  if (error) {
    redirect(withParams("/forgot-password", { error: "password_reset_failed" }));
  }

  redirect(withParams("/forgot-password", { notice: "password_reset_sent" }));
}
