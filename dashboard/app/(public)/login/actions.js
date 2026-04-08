"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env.js";
import { safeReturnUrl, withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server.js";

const OAUTH_PROVIDERS = new Set(["google", "facebook", "apple"]);
const PROVIDER_SCOPES = {
  facebook: "public_profile"
};

export async function signInWithOAuth(formData) {
  const returnUrl = safeReturnUrl(formData.get("returnUrl"));
  const provider = String(formData.get("provider") ?? "").trim();

  if (!hasSupabaseServerConfig()) {
    redirect(withParams("/login", { returnUrl, error: "auth_not_configured" }));
  }

  if (!OAUTH_PROVIDERS.has(provider)) {
    redirect(withParams("/login", { returnUrl, error: "unsupported_provider" }));
  }

  const callbackUrl = new URL("/auth/callback", getAppUrl());
  callbackUrl.searchParams.set("next", returnUrl);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: PROVIDER_SCOPES[provider]
    }
  });

  if (error || !data?.url) {
    redirect(withParams("/login", { returnUrl, error: "oauth_start_failed" }));
  }

  redirect(data.url);
}
