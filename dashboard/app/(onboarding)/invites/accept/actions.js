"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { acceptFarmMemberInvite } from "@/lib/backend/farm-settings.js";

export async function acceptInvite(formData) {
  const token = String(formData.get("invite_token") ?? "").trim();
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: withParams("/invites/accept", { token }) }));
  }

  if (!token) {
    redirect(withParams("/invites/accept", { error: "invite_token_required" }));
  }

  const result = await acceptFarmMemberInvite({
    actorUserId: user.id,
    inviteToken: token,
    acceptedEmail: user.email ?? ""
  });

  if (!result.ok) {
    redirect(withParams("/invites/accept", { token, error: result.code ?? "invite_accept_failed" }));
  }

  const farmId = result.result?.member?.farm_id;
  redirect(withParams(farmId ? `/farms/${farmId}` : "/dashboard", { invite: "accepted" }));
}
