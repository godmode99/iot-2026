import { NextResponse } from "next/server";
import { safeReturnUrl, withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server.js";

async function needsOnboarding(supabase) {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult?.user ?? null;

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("profile_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return !profile?.profile_completed_at;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeReturnUrl(requestUrl.searchParams.get("next"));

  if (!hasSupabaseServerConfig()) {
    return NextResponse.redirect(new URL(withParams("/login", { error: "auth_not_configured" }), requestUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(withParams("/login", { error: "missing_auth_code" }), requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(withParams("/login", { error: "callback_failed" }), requestUrl.origin));
  }

  if (await needsOnboarding(supabase)) {
    return NextResponse.redirect(new URL(withParams("/onboarding", { next }), requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
