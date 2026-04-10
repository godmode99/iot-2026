import { actorTypeForUser, getDashboardDb, ok, fail } from "@/lib/backend/db.js";

function cleanNote(value, max = 600) {
  return String(value ?? "").trim().slice(0, max);
}

export async function createOpsHandoffNote({ actorUserId, farmId, note, context = {} }) {
  const normalizedFarmId = String(farmId ?? "").trim();
  const normalizedNote = cleanNote(note);

  if (!normalizedFarmId) {
    return fail("farm_id_required");
  }

  if (!normalizedNote) {
    return fail("handoff_note_required");
  }

  const sql = getDashboardDb();
  return sql.begin(async (trx) => {
    const accessRows = await trx`
      select exists (
        select 1
        from public.user_profiles profile
        where profile.user_id = ${actorUserId}::uuid
          and profile.user_type in ('super_admin', 'operator')
      ) as allowed
    `;

    if (accessRows[0]?.allowed !== true) {
      return fail("ops_workspace_access_denied", [], 403);
    }

    const farmRows = await trx`
      select id, name
      from public.farms
      where id = ${normalizedFarmId}::uuid
      limit 1
    `;

    if (!farmRows[0]?.id) {
      return fail("farm_not_found", [], 404);
    }

    const actorType = await actorTypeForUser(trx, actorUserId);
    const details = {
      note: normalizedNote,
      workspace_context: {
        view: String(context.view ?? "").trim() || null,
        queue: String(context.queue ?? "").trim() || null,
        pinned_farm: String(context.pinnedFarmId ?? "").trim() || null
      }
    };

    const noteRows = await trx`
      insert into public.audit_log (
        actor_user_id,
        actor_type,
        farm_id,
        action,
        target_type,
        target_id,
        details_json
      ) values (
        ${actorUserId}::uuid,
        ${actorType},
        ${normalizedFarmId}::uuid,
        'ops.handoff_noted',
        'farm',
        ${normalizedFarmId}::uuid,
        ${trx.json(details)}::jsonb
      )
      returning id, farm_id, action, details_json, created_at
    `;

    return ok("ops_handoff_note_created", {
      note: noteRows[0],
      farm: farmRows[0]
    }, 201);
  });
}

export async function createOpsTelemetryOutcome({ actorUserId, farmId, outcome, context = {} }) {
  const normalizedFarmId = String(farmId ?? "").trim();
  const normalizedOutcome = String(outcome ?? "").trim();

  if (!normalizedFarmId) {
    return fail("farm_id_required");
  }

  if (!normalizedOutcome) {
    return fail("telemetry_outcome_required");
  }

  const sql = getDashboardDb();
  return sql.begin(async (trx) => {
    const accessRows = await trx`
      select exists (
        select 1
        from public.user_profiles profile
        where profile.user_id = ${actorUserId}::uuid
          and profile.user_type in ('super_admin', 'operator', 'customer', 'reseller')
      ) as allowed
    `;

    if (accessRows[0]?.allowed !== true) {
      return fail("ops_workspace_access_denied", [], 403);
    }

    const farmRows = await trx`
      select id, name
      from public.farms
      where id = ${normalizedFarmId}::uuid
      limit 1
    `;

    if (!farmRows[0]?.id) {
      return fail("farm_not_found", [], 404);
    }

    const actorType = await actorTypeForUser(trx, actorUserId);
    const details = {
      outcome: normalizedOutcome,
      source: "telemetry-pressure",
      workspace_context: {
        return_to: String(context.returnTo ?? "").trim() || null,
        queue: String(context.queue ?? "").trim() || null,
        summary: String(context.summary ?? "").trim() || null
      }
    };

    const rows = await trx`
      insert into public.audit_log (
        actor_user_id,
        actor_type,
        farm_id,
        action,
        target_type,
        target_id,
        details_json
      ) values (
        ${actorUserId}::uuid,
        ${actorType},
        ${normalizedFarmId}::uuid,
        'ops.telemetry_follow_up_completed',
        'farm',
        ${normalizedFarmId}::uuid,
        ${trx.json(details)}::jsonb
      )
      returning id, farm_id, action, details_json, created_at
    `;

    return ok("ops_telemetry_outcome_created", {
      event: rows[0],
      farm: farmRows[0]
    }, 201);
  });
}
