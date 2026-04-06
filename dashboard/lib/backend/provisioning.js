import { buildTrustedActorHeaders, fetchBackendJson } from "./admin.js";

export async function resolveProvisioningTarget({ qr, actorUserId }) {
  const query = new URLSearchParams({ qr });

  return fetchBackendJson(`/api/provisioning/resolve?${query.toString()}`, {
    headers: buildTrustedActorHeaders(actorUserId)
  });
}

export async function bindProvisioningTarget({ qr, farmId, actorUserId }) {
  return fetchBackendJson("/api/provisioning/bind", {
    method: "POST",
    headers: {
      ...buildTrustedActorHeaders(actorUserId, { "content-type": "application/json" })
    },
    body: JSON.stringify({
      qr,
      farm_id: farmId
    })
  });
}
