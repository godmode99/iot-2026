"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { withParams } from "@/lib/auth/urls.js";
import { createOpsHandoffNote, createOpsTelemetryOutcome } from "@/lib/backend/ops-workspace.js";

function text(value, max = 600) {
  return String(value ?? "").trim().slice(0, max);
}

function safeReturnTo(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/ops/follow-ups")) {
    return "/ops/follow-ups";
  }

  return normalized;
}

function isTelemetryWorkspaceReturn(value) {
  return String(value ?? "").includes("queue=telemetry-pressure");
}

export async function saveOpsHandoffNote(formData) {
  const { authConfigured, user } = await getCurrentUser();
  const returnTo = safeReturnTo(formData.get("return_to"));
  const farmId = text(formData.get("farm_id"), 120);
  const note = text(formData.get("handoff_note"), 600);
  const view = text(formData.get("view"), 40);
  const queue = text(formData.get("queue"), 60);
  const pinnedFarmId = text(formData.get("pin_farm"), 120);

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: returnTo }));
  }

  if (!farmId || !note) {
    redirect(withParams(returnTo, { handoff_error: "handoff_note_required", focus_farm: farmId || pinnedFarmId }));
  }

  const result = await createOpsHandoffNote({
    actorUserId: user.id,
    farmId,
    note,
    context: {
      view,
      queue,
      pinnedFarmId
    }
  });

  if (!result.ok) {
    redirect(withParams(returnTo, {
      handoff_error: result.code ?? "handoff_note_failed",
      focus_farm: farmId
    }));
  }

  if (isTelemetryWorkspaceReturn(returnTo)) {
    await createOpsTelemetryOutcome({
      actorUserId: user.id,
      farmId,
      outcome: "handoff_follow_up",
      context: {
        returnTo,
        queue: "telemetry-pressure",
        summary: "handoff_saved"
      }
    });
  }

  redirect(withParams(returnTo, {
    handoff_saved: "1",
    focus_farm: farmId,
    focus_action: "handoff_follow_up"
  }));
}
