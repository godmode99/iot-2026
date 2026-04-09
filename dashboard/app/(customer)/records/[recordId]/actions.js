"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";
import { createRecordDrivenAlert } from "@/lib/backend/device-ops.js";

const ALERT_SEVERITIES = new Set(["critical", "warning", "info"]);

export async function createAlertFromRecordAction(formData) {
  const recordId = String(formData.get("record_id") ?? "").trim();
  const alertType = String(formData.get("alert_type") ?? "").trim();
  const severity = String(formData.get("severity") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!recordId || !alertType || !ALERT_SEVERITIES.has(severity)) {
    redirect(withParams(`/records/${recordId}`, { error: "alert_create_invalid" }));
  }

  const { authConfigured, user } = await getCurrentUser();
  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: `/records/${recordId}` }));
  }

  const supabase = await createSupabaseServerClient();
  const recordResult = await supabase
    .from("operational_records")
    .select("id,farm_id,notes_summary,recorded_for_date")
    .eq("id", recordId)
    .maybeSingle();

  if (recordResult.error || !recordResult.data?.farm_id) {
    redirect(withParams(`/records/${recordId}`, { error: "record_not_visible" }));
  }

  const permissionResult = await supabase.rpc("can_manage_farm_alerts", {
    target_farm_id: recordResult.data.farm_id
  });

  if (permissionResult.data !== true) {
    redirect(withParams(`/records/${recordId}`, { error: "alert_permission_denied" }));
  }

  const result = await createRecordDrivenAlert({
    farmId: recordResult.data.farm_id,
    recordId,
    actorUserId: user.id,
    alertType,
    severity,
    note,
    details: {
      record_date: recordResult.data.recorded_for_date,
      record_summary: recordResult.data.notes_summary ?? ""
    }
  });

  if (!result.ok) {
    redirect(withParams(`/records/${recordId}`, { error: result.code ?? "alert_create_failed" }));
  }

  const createdAlertId = result.result?.alert?.id;
  if (result.code === "alert_already_open" && createdAlertId) {
    redirect(withParams(`/alerts/${createdAlertId}`, { alert: "already_open" }));
  }

  if (createdAlertId) {
    redirect(withParams(`/alerts/${createdAlertId}`, { alert: "created_from_record" }));
  }

  redirect(withParams(`/records/${recordId}`, { alert: "created_from_record" }));
}
