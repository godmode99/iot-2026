import { NextResponse } from "next/server";
import { safeReturnUrl, withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server.js";

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

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

