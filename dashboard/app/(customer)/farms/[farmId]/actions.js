"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import {
  assignResellerToFarm,
  createFarmMemberInvite,
  saveNotificationPreference,
  updateFarmDeliveryContacts
} from "@/lib/backend/farm-settings.js";
import { createMissingRecordAlert } from "@/lib/backend/device-ops.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function safeReturnTo(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/ops")) {
    return "";
  }

  return normalized;
}

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
  const returnTo = safeReturnTo(formData.get("return_to"));
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

  if (returnTo) {
    redirect(withParams(returnTo, {
      focus_farm: farmId,
      focus_action: "dispatch_follow_up",
      dispatch_result: "preferences"
    }));
  }

  redirect(withParams(`/farms/${farmId}`, { notification: "updated" }));
}

export async function updateFarmContactsAction(formData) {
  const farmId = String(formData.get("farm_id") ?? "");
  const user = await requireFarmManager(farmId);
  const returnTo = safeReturnTo(formData.get("return_to"));
  const alertEmailTo = optionalText(formData.get("alert_email_to"));
  const alertLineUserId = optionalText(formData.get("alert_line_user_id"));

  if (alertEmailTo && !emailPattern.test(alertEmailTo)) {
    redirect(withParams(`/farms/${farmId}`, { error: "alert_email_invalid" }));
  }

  const result = await updateFarmDeliveryContacts({
    farmId,
    actorUserId: user.id,
    alertEmailTo,
    alertLineUserId
  });

  if (!result.ok) {
    redirect(withParams(`/farms/${farmId}`, { error: result.code ?? "farm_contacts_update_failed" }));
  }

  if (returnTo) {
    redirect(withParams(returnTo, {
      focus_farm: farmId,
      focus_action: "dispatch_follow_up",
      dispatch_result: "contacts"
    }));
  }

  redirect(withParams(`/farms/${farmId}`, { notification: "contacts_updated" }));
}

export async function createMissingRecordAlertAction(formData) {
  const farmId = String(formData.get("farm_id") ?? "");
  const user = await requireFarmManager(farmId);
  const templateId = String(formData.get("template_id") ?? "").trim();
  const templateCode = String(formData.get("template_code") ?? "").trim();
  const templateName = String(formData.get("template_name") ?? "").trim();

  const result = await createMissingRecordAlert({
    farmId,
    actorUserId: user.id,
    templateId,
    templateCode,
    templateName,
    note: `Missing recent record for ${templateName || templateCode}`,
    details: {
      expected_window_days: 7
    }
  });

  if (!result.ok) {
    redirect(withParams(`/farms/${farmId}`, { error: result.code ?? "missing_record_alert_failed" }));
  }

  redirect(withParams(`/farms/${farmId}`, {
    notification: result.code === "alert_already_open" ? "missing_record_alert_exists" : "missing_record_alert_created"
  }));
}
