"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n.js";
import { safeReturnUrl, withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";

function cleanDisplayName(value) {
  return String(value ?? "").trim().slice(0, 120);
}

export async function completeOnboarding(formData) {
  const next = safeReturnUrl(formData.get("next"));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(withParams("/onboarding", { next, error: "auth_not_configured" }));
  }

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult?.user ?? null;

  if (!user) {
    redirect(withParams("/login", { returnUrl: withParams("/onboarding", { next }), error: "auth_required" }));
  }

  const displayName = cleanDisplayName(formData.get("display_name"));
  const preferredLocale = normalizeLocale(String(formData.get("preferred_locale") ?? ""));
  const { error } = await supabase.rpc("update_own_profile", {
    target_display_name: displayName,
    target_preferred_locale: preferredLocale
  });

  if (error) {
    redirect(withParams("/onboarding", { next, error: error.message }));
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, preferredLocale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  redirect(next);
}
