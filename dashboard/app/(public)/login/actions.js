"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env.js";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server.js";

function safeReturnUrl(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function withParams(path, params) {
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
}

export async function signInWithPassword(formData) {
  const returnUrl = safeReturnUrl(formData.get("returnUrl"));

  if (!hasSupabaseServerConfig()) {
    redirect(withParams("/login", { returnUrl, error: "auth_not_configured" }));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(withParams("/login", { returnUrl, error: "login_failed" }));
  }

  redirect(returnUrl);
}

export async function signUpWithPassword(formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!hasSupabaseServerConfig()) {
    redirect(withParams("/signup", { error: "auth_not_configured" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/dashboard`
    }
  });

  if (error) {
    redirect(withParams("/signup", { error: "signup_failed" }));
  }

  redirect(withParams("/login", { notice: "check_email" }));
}

