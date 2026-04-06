"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export async function createFarm(formData) {
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: "/farms/new" }));
  }

  const name = String(formData.get("name") ?? "").trim();
  const alertEmailTo = optionalText(formData.get("alert_email_to"));
  const alertLineUserId = optionalText(formData.get("alert_line_user_id"));

  if (name.length < 2 || name.length > 120) {
    redirect(withParams("/farms/new", { error: "farm_name_invalid" }));
  }

  if (alertEmailTo && !emailPattern.test(alertEmailTo)) {
    redirect(withParams("/farms/new", { error: "alert_email_invalid" }));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("farms")
    .insert({
      name,
      owner_user_id: user.id,
      alert_email_to: alertEmailTo,
      alert_line_user_id: alertLineUserId
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect(withParams("/farms/new", { error: error?.code ?? "farm_create_failed" }));
  }

  redirect(withParams(`/farms/${data.id}`, { farm: "created" }));
}
