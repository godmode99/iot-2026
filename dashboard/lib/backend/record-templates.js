import { actorTypeForUser, fail, getDashboardDb, ok, userCanManageRecordTemplates } from "./db.js";

function sanitizeTemplateCode(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFieldRows(fieldRows = []) {
  return fieldRows
    .map((row, index) => ({
      field_key: String(row.field_key ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, ""),
      field_type: ["number", "text", "boolean"].includes(row.field_type) ? row.field_type : "text",
      label: String(row.label ?? "").trim(),
      unit: String(row.unit ?? "").trim() || null,
      placeholder: String(row.placeholder ?? "").trim() || null,
      sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : (index + 1) * 10,
      is_required: row.is_required === true
    }))
    .filter((row) => row.field_key && row.label);
}

function normalizeAssignedFarmIds(assignedFarmIds = []) {
  return [...new Set(
    assignedFarmIds
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  )];
}

export async function upsertRecordTemplate({ templateId = null, actorUserId, template, fieldRows = [], assignedFarmIds = [] }) {
  const sql = getDashboardDb();
  const allowed = await userCanManageRecordTemplates(sql, actorUserId);

  if (!allowed) {
    return fail("record_template_permission_denied", [actorUserId], 403);
  }

  const code = sanitizeTemplateCode(template?.code);
  const name = String(template?.name ?? "").trim();
  const description = String(template?.description ?? "").trim() || null;
  const isActive = template?.is_active !== false;
  const scopeType = ["global", "organization", "farm"].includes(template?.scope_type) ? template.scope_type : "farm";
  const rawOrganizationId = String(template?.organization_id ?? "").trim() || null;
  const organizationId = scopeType === "organization" ? rawOrganizationId : null;

  if (!code || !name) {
    return fail("record_template_invalid", [code, name], 400);
  }

  if (scopeType === "organization" && !organizationId) {
    return fail("record_template_organization_required", [scopeType], 400);
  }

  const normalizedFields = normalizeFieldRows(fieldRows);
  if (!normalizedFields.length) {
    return fail("record_template_fields_missing", [], 400);
  }
  const normalizedAssignedFarmIds = scopeType === "farm" ? normalizeAssignedFarmIds(assignedFarmIds) : [];

  const actorType = await actorTypeForUser(sql, actorUserId);
  const templateRows = templateId
    ? await sql`
        update public.record_templates
        set
          code = ${code},
          name = ${name},
          description = ${description},
          scope_type = ${scopeType},
          organization_id = ${organizationId},
          is_active = ${isActive}
        where id = ${templateId}::uuid
        returning id, code, name, description, scope_type, organization_id, is_active
      `
    : await sql`
        insert into public.record_templates (
          code,
          name,
          description,
          scope_type,
          is_active,
          organization_id
        ) values (
          ${code},
          ${name},
          ${description},
          ${scopeType},
          ${isActive},
          ${organizationId}
        )
        returning id, code, name, description, scope_type, organization_id, is_active
      `;

  const savedTemplate = templateRows[0] ?? null;
  if (!savedTemplate) {
    return fail("record_template_save_failed", [templateId, code], 500);
  }

  await sql`
    update public.record_template_fields
    set is_active = false
    where template_id = ${savedTemplate.id}::uuid
  `;

  await sql`
    delete from public.record_template_farm_assignments
    where template_id = ${savedTemplate.id}::uuid
  `;

  for (const row of normalizedFields) {
    await sql`
      insert into public.record_template_fields (
        template_id,
        field_key,
        field_type,
        label,
        unit,
        placeholder,
        sort_order,
        is_required,
        is_active
      ) values (
        ${savedTemplate.id}::uuid,
        ${row.field_key},
        ${row.field_type},
        ${row.label},
        ${row.unit},
        ${row.placeholder},
        ${row.sort_order},
        ${row.is_required},
        true
      )
      on conflict (template_id, field_key) do update
      set
        field_type = excluded.field_type,
        label = excluded.label,
        unit = excluded.unit,
        placeholder = excluded.placeholder,
        sort_order = excluded.sort_order,
        is_required = excluded.is_required,
        is_active = true
    `;
  }

  for (const farmId of normalizedAssignedFarmIds) {
    await sql`
      insert into public.record_template_farm_assignments (
        template_id,
        farm_id
      ) values (
        ${savedTemplate.id}::uuid,
        ${farmId}::uuid
      )
      on conflict (template_id, farm_id) do nothing
    `;
  }

  await sql`
    insert into public.audit_log (
      actor_user_id,
      actor_type,
      action,
      entity_type,
      entity_id,
      details_json
    ) values (
      ${actorUserId}::uuid,
      ${actorType},
      ${templateId ? "record_template_updated" : "record_template_created"},
      'record_template',
      ${savedTemplate.id}::uuid,
      ${sql.json({
        code,
        scope_type: scopeType,
        organization_id: organizationId,
        field_count: normalizedFields.length,
        assigned_farm_count: normalizedAssignedFarmIds.length
      })}::jsonb
    )
  `;

  return ok("record_template_saved", {
    template: savedTemplate
  }, templateId ? 200 : 201);
}

export async function setRecordTemplateArchived({ templateId, actorUserId, archived }) {
  const sql = getDashboardDb();
  const allowed = await userCanManageRecordTemplates(sql, actorUserId);

  if (!allowed) {
    return fail("record_template_permission_denied", [actorUserId], 403);
  }

  const rows = await sql`
    update public.record_templates
    set is_active = ${archived ? false : true}
    where id = ${templateId}::uuid
    returning id, code, name, is_active
  `;
  const template = rows[0] ?? null;

  if (!template) {
    return fail("record_template_not_found", [templateId], 404);
  }

  const actorType = await actorTypeForUser(sql, actorUserId);
  await sql`
    insert into public.audit_log (
      actor_user_id,
      actor_type,
      action,
      entity_type,
      entity_id,
      details_json
    ) values (
      ${actorUserId}::uuid,
      ${actorType},
      ${archived ? "record_template_archived" : "record_template_unarchived"},
      'record_template',
      ${template.id}::uuid,
      ${sql.json({
        code: template.code,
        is_active: template.is_active
      })}::jsonb
    )
  `;

  return ok("record_template_archive_updated", { template });
}

export async function cloneRecordTemplate({ templateId, actorUserId }) {
  const sql = getDashboardDb();
  const allowed = await userCanManageRecordTemplates(sql, actorUserId);

  if (!allowed) {
    return fail("record_template_permission_denied", [actorUserId], 403);
  }

  const templateRows = await sql`
    select id, code, name, description, scope_type, organization_id, is_active
    from public.record_templates
    where id = ${templateId}::uuid
    limit 1
  `;
  const sourceTemplate = templateRows[0] ?? null;

  if (!sourceTemplate) {
    return fail("record_template_not_found", [templateId], 404);
  }

  const fieldRows = await sql`
    select field_key, field_type, label, unit, placeholder, sort_order, is_required
    from public.record_template_fields
    where template_id = ${sourceTemplate.id}::uuid
      and is_active = true
    order by sort_order asc
  `;
  const assignedFarmRows = await sql`
    select farm_id
    from public.record_template_farm_assignments
    where template_id = ${sourceTemplate.id}::uuid
  `;

  let candidateCode = `${sourceTemplate.code}_copy`;
  let suffix = 2;
  while (true) {
    const existingRows = await sql`
      select id
      from public.record_templates
      where code = ${candidateCode}
      limit 1
    `;
    if (!existingRows[0]) {
      break;
    }
    candidateCode = `${sourceTemplate.code}_copy_${suffix}`;
    suffix += 1;
  }

  const cloned = await upsertRecordTemplate({
    actorUserId,
    template: {
      code: candidateCode,
      name: `${sourceTemplate.name} Copy`,
      description: sourceTemplate.description,
      scope_type: sourceTemplate.scope_type,
      organization_id: sourceTemplate.organization_id,
      is_active: sourceTemplate.is_active
    },
    fieldRows,
    assignedFarmIds: assignedFarmRows.map((row) => row.farm_id)
  });

  return cloned.ok
    ? ok("record_template_cloned", cloned.result, 201)
    : cloned;
}
