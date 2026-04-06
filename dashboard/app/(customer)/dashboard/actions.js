"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect(withParams("/login", { notice: "signed_out" }));
}

