"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import {
  assignResellerToFarm,
  createFarmMemberInvite,
  saveNotificationPreference
} from "@/lib/backend/farm-settings.js";

async function requireFarmManager(farmId) {
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: `/farms/${farmId}` }));
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("can_manage_farm_settings", {
    target_farm_id: farmId
  });

  if (data !== true) {
    redirect(withParams(`/farms/${farmId}`, { error: "farm_permission_denied" }));
  }

  return user;
}

function checkboxValue(formData, name) {
  return formData.get(name) === "on";
}

function inviteCookieName(farmId) {
  return `sb_invite_token_${farmId}`;
}

export async function createMemberInvite(formData) {
  const farmId = String(formData.get("farm_id") ?? "");
  const user = await requireFarmManager(farmId);
  const email = String(formData.get("email") ?? "").trim();
  const result = await createFarmMemberInvite({
    farmId,
    actorUserId: user.id,
    email,
    permissions: {
      can_view: true,
      can_receive_alerts: checkboxValue(formData, "can_receive_alerts"),
      can_manage_alerts: checkboxValue(formData, "can_manage_alerts"),
      can_send_commands: checkboxValue(formData, "can_send_commands")
    }
  });

  if (!result.ok) {
    redirect(withParams(`/farms/${farmId}`, { error: result.code ?? "invite_failed" }));
  }

  const cookieStore = await cookies();
  cookieStore.set(inviteCookieName(farmId), result.result?.inviteToken ?? "", {
    httpOnly: true,
    maxAge: 10 * 60,
    path: `/farms/${farmId}`,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  redirect(withParams(`/farms/${farmId}`, {
    invite: "created"
  }));
}

export async function assignReseller(formData) {
  const farmId = String(formData.get("farm_id") ?? "");
  const user = await requireFarmManager(farmId);
  const resellerUserId = String(formData.get("reseller_user_id") ?? "").trim();
  const result = await assignResellerToFarm({
    farmId,
    actorUserId: user.id,
    resellerUserId,
    canManageAlerts: checkboxValue(formData, "can_manage_alerts"),
    canSendSafeCommands: checkboxValue(formData, "can_send_safe_commands")
  });

  if (!result.ok) {
    redirect(withParams(`/farms/${farmId}`, { error: result.code ?? "reseller_assign_failed" }));
  }

  redirect(withParams(`/farms/${farmId}`, { reseller: "assigned" }));
}

export async function updateOwnNotificationPreference(formData) {
  const farmId = String(formData.get("farm_id") ?? "");
  const user = await requireFarmManager(farmId);
  const alertTypes = ["threshold", "low_battery", "sensor_fault", "offline"].filter((type) => checkboxValue(formData, `alert_${type}`));
  const result = await saveNotificationPreference({
    farmId,
    userId: user.id,
    actorUserId: user.id,
    emailEnabled: checkboxValue(formData, "email_enabled"),
    lineEnabled: checkboxValue(formData, "line_enabled"),
    criticalOnly: checkboxValue(formData, "critical_only"),
    alertTypes
  });

  if (!result.ok) {
    redirect(withParams(`/farms/${farmId}`, { error: result.code ?? "notification_preference_failed" }));
  }

  redirect(withParams(`/farms/${farmId}`, { notification: "updated" }));
}
