"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env.js";
import { safeReturnUrl, withParams } from "@/lib/auth/urls.js";
import { getOAuthProviderScopes, isEnabledOAuthProvider } from "@/lib/auth/oauth-providers.js";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server.js";

export async function signInWithOAuth(formData) {
  const returnUrl = safeReturnUrl(formData.get("returnUrl"));
  const provider = String(formData.get("provider") ?? "").trim();

  if (!hasSupabaseServerConfig()) {
    redirect(withParams("/login", { returnUrl, error: "auth_not_configured" }));
  }

  if (!isEnabledOAuthProvider(provider)) {
    redirect(withParams("/login", { returnUrl, error: "unsupported_provider" }));
  }

  const callbackUrl = new URL("/auth/callback", getAppUrl());
  callbackUrl.searchParams.set("next", returnUrl);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: getOAuthProviderScopes(provider)
    }
  });

  if (error || !data?.url) {
    redirect(withParams("/login", { returnUrl, error: "oauth_start_failed" }));
  }

  redirect(data.url);
}
