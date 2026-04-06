"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";

export async function updatePassword(formData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: "/reset-password", error: "auth_required" }));
  }

  if (password.length < 8 || password !== confirmPassword) {
    redirect(withParams("/reset-password", { error: "password_invalid" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(withParams("/reset-password", { error: "password_update_failed" }));
  }

  redirect(withParams("/dashboard", { notice: "password_updated" }));
}
