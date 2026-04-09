"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { updateAlertStatus } from "@/lib/backend/device-ops.js";

const ALERT_ACTIONS = new Set(["acknowledge", "suppress", "resolve"]);

export async function submitCustomerAlertAction(formData) {
  const alertId = String(formData.get("alert_id") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!ALERT_ACTIONS.has(action)) {
    redirect(withParams(`/alerts/${alertId}`, { error: "alert_action_invalid" }));
  }

  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: `/alerts/${alertId}` }));
  }

  const supabase = await createSupabaseServerClient();
  const alertResult = await supabase
    .from("alerts")
    .select("id,farm_id")
    .eq("id", alertId)
    .maybeSingle();

  if (alertResult.error || !alertResult.data?.farm_id) {
    redirect(withParams(`/alerts/${alertId}`, { error: "alert_not_visible" }));
  }

  const permissionResult = await supabase.rpc("can_manage_farm_alerts", {
    target_farm_id: alertResult.data.farm_id
  });

  if (permissionResult.data !== true) {
    redirect(withParams(`/alerts/${alertId}`, { error: "alert_permission_denied" }));
  }

  const result = await updateAlertStatus({
    alertId,
    action,
    actorUserId: user.id,
    note: `customer_alert_${action}`
  });

  if (!result.ok) {
    redirect(withParams(`/alerts/${alertId}`, { error: result.code ?? "alert_action_failed" }));
  }

  redirect(withParams(`/alerts/${alertId}`, { alert: action }));
}
