"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n.js";

function cleanDisplayName(value) {
  return String(value ?? "").trim().slice(0, 120);
}

function redirectWithError(code) {
  redirect(`/settings?error=${encodeURIComponent(code)}`);
}

export async function updateAccountSettings(formData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError("auth_not_configured");
  }

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult?.user ?? null;

  if (!user) {
    redirect("/login?returnUrl=/settings");
  }

  const displayName = cleanDisplayName(formData.get("display_name"));
  const preferredLocale = normalizeLocale(String(formData.get("preferred_locale") ?? ""));
  const { error } = await supabase.rpc("update_own_profile", {
    target_display_name: displayName,
    target_preferred_locale: preferredLocale
  });

  if (error) {
    redirectWithError(error.message);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, preferredLocale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=profile");
}
