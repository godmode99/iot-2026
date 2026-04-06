import { NextResponse } from "next/server";
import { withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";

export async function POST(request) {
  const requestUrl = new URL(request.url);
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL(withParams("/login", { notice: "signed_out" }), requestUrl.origin));
}

