"use server";

import { redirect } from "next/navigation";
import { withParams } from "@/lib/auth/urls.js";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { cloneRecordTemplate, setRecordTemplateArchived, upsertRecordTemplate } from "@/lib/backend/record-templates.js";

function parseFieldRows(formData) {
  const keys = formData.getAll("field_key");
  const labels = formData.getAll("field_label");
  const types = formData.getAll("field_type");
  const units = formData.getAll("field_unit");
  const placeholders = formData.getAll("field_placeholder");
  const required = formData.getAll("field_required");

  return keys.map((fieldKey, index) => ({
    field_key: String(fieldKey ?? ""),
    label: String(labels[index] ?? ""),
    field_type: String(types[index] ?? "text"),
    unit: String(units[index] ?? ""),
    placeholder: String(placeholders[index] ?? ""),
    is_required: String(required[index] ?? "") === "true"
  }));
}

function parseAssignedFarmIds(formData) {
  return formData.getAll("assigned_farm_id").map((value) => String(value ?? "").trim()).filter(Boolean);
}

export async function submitRecordTemplateAction(formData) {
  const templateId = String(formData.get("template_id") ?? "").trim() || null;
  const template = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    scope_type: String(formData.get("scope_type") ?? "").trim(),
    organization_id: String(formData.get("organization_id") ?? "").trim(),
    is_active: String(formData.get("is_active") ?? "") === "true"
  };

  const { authConfigured, user } = await getCurrentUser();
  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: templateId ? `/records/templates/${templateId}/edit` : "/records/templates/new" }));
  }

  const result = await upsertRecordTemplate({
    templateId,
    actorUserId: user.id,
    template,
    fieldRows: parseFieldRows(formData),
    assignedFarmIds: parseAssignedFarmIds(formData)
  });

  if (!result.ok) {
    const failurePath = templateId ? `/records/templates/${templateId}/edit` : "/records/templates/new";
    redirect(withParams(failurePath, { error: result.code ?? "record_template_save_failed" }));
  }

  redirect(withParams("/records/templates", { template: templateId ? "updated" : "created" }));
}

export async function toggleRecordTemplateArchiveAction(formData) {
  const templateId = String(formData.get("template_id") ?? "").trim();
  const archived = String(formData.get("archived") ?? "") === "true";

  const { authConfigured, user } = await getCurrentUser();
  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: `/records/templates/${templateId}/edit` }));
  }

  const result = await setRecordTemplateArchived({
    templateId,
    actorUserId: user.id,
    archived
  });

  if (!result.ok) {
    redirect(withParams(`/records/templates/${templateId}/edit`, { error: result.code ?? "record_template_archive_failed" }));
  }

  redirect(withParams("/records/templates", { template: archived ? "archived" : "unarchived" }));
}

export async function cloneRecordTemplateAction(formData) {
  const templateId = String(formData.get("template_id") ?? "").trim();

  const { authConfigured, user } = await getCurrentUser();
  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: "/records/templates" }));
  }

  const result = await cloneRecordTemplate({
    templateId,
    actorUserId: user.id
  });

  if (!result.ok) {
    redirect(withParams("/records/templates", { error: result.code ?? "record_template_clone_failed" }));
  }

  redirect(withParams("/records/templates", { template: "cloned" }));
}
