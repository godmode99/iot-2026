"use server";

import { redirect } from "next/navigation";
import { bindProvisioningTarget } from "@/lib/backend/provisioning.js";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";

export async function bindDeviceToSelectedFarm(formData) {
  const qr = String(formData.get("qr") ?? "").trim();
  const farmId = String(formData.get("farm_id") ?? "").trim();
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: withParams("/provision", { qr }) }));
  }

  let result;
  try {
    result = await bindProvisioningTarget({
      qr,
      farmId,
      actorUserId: user.id
    });
  } catch {
    redirect(withParams("/provision", { qr, error: "provisioning_backend_unavailable" }));
  }

  if (!result.ok) {
    redirect(withParams("/provision", { qr, error: result.code ?? "bind_failed" }));
  }

  const deviceId = result.result?.device?.device_id ?? "";
  redirect(withParams("/provision", { qr: deviceId || qr, bound: result.code ?? "device_bound" }));
}
