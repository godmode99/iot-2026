"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { withParams } from "@/lib/auth/urls.js";
import { createSupabaseServerClient } from "@/lib/supabase/server.js";

function text(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalBoolean(value) {
  if (value === "true" || value === "on" || value === true) {
    return true;
  }

  return null;
}

function normalizeRecordStatus(value) {
  return value === "draft" ? "draft" : "submitted";
}

function parseTemplateFieldValue(formData, field) {
  if (field.field_type === "number") {
    const valueNumber = optionalNumber(formData.get(field.field_key));
    if (valueNumber === null) {
      return null;
    }

    return {
      field_key: field.field_key,
      field_type: field.field_type,
      label: field.label,
      value_number: valueNumber,
      unit: field.unit ?? null,
      sort_order: field.sort_order ?? 0
    };
  }

  if (field.field_type === "boolean") {
    const valueBoolean = optionalBoolean(formData.get(field.field_key));
    if (valueBoolean === null) {
      return null;
    }

    return {
      field_key: field.field_key,
      field_type: field.field_type,
      label: field.label,
      value_boolean: valueBoolean,
      unit: null,
      sort_order: field.sort_order ?? 0
    };
  }

  const valueText = text(formData.get(field.field_key), 1000);
  if (!valueText) {
    return null;
  }

  return {
    field_key: field.field_key,
    field_type: field.field_type,
    label: field.label,
    value_text: valueText,
    unit: field.unit ?? null,
    sort_order: field.sort_order ?? 0
  };
}

export async function createOperationalRecord(formData) {
  const { authConfigured, user } = await getCurrentUser();

  if (!authConfigured || !user) {
    redirect(withParams("/login", { returnUrl: "/records/new" }));
  }

  const farmId = text(formData.get("farm_id"), 120);
  const templateId = text(formData.get("template_id"), 120);
  const recordedForDate = text(formData.get("recorded_for_date"), 40);
  const notesSummary = text(formData.get("notes_summary"), 500);
  const recordStatus = normalizeRecordStatus(text(formData.get("record_status"), 20));

  if (!farmId || !templateId || !recordedForDate) {
    redirect(withParams("/records/new", { error: "missing_required_fields" }));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(withParams("/records/new", { error: "auth_not_configured" }));
  }

  const templateResult = await supabase
    .from("record_templates")
    .select("id,scope_type,is_active,record_template_farm_assignments(farm_id),record_template_fields(field_key,field_type,label,unit,sort_order,is_required,is_active)")
    .eq("id", templateId)
    .maybeSingle();

  if (templateResult.error || !templateResult.data) {
    redirect(withParams("/records/new", { error: "template_not_visible" }));
  }

  if (templateResult.data.is_active === false || templateResult.data.scope_type === "organization") {
    redirect(withParams("/records/new", { error: "template_scope_unavailable" }));
  }

  const assignedFarmIds = Array.isArray(templateResult.data.record_template_farm_assignments)
    ? templateResult.data.record_template_farm_assignments.map((assignment) => assignment.farm_id).filter(Boolean)
    : [];

  if (templateResult.data.scope_type === "farm" && assignedFarmIds.length && !assignedFarmIds.includes(farmId)) {
    redirect(withParams("/records/new", { error: "template_not_assigned_to_farm" }));
  }

  const templateFields = Array.isArray(templateResult.data.record_template_fields)
    ? templateResult.data.record_template_fields
        .filter((field) => field.is_active !== false)
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    : [];

  const missingRequiredField = templateFields.find((field) => {
    if (field.is_required !== true) {
      return false;
    }

    if (field.field_type === "number") {
      return optionalNumber(formData.get(field.field_key)) === null;
    }

    if (field.field_type === "boolean") {
      return optionalBoolean(formData.get(field.field_key)) === null;
    }

    return !text(formData.get(field.field_key), 1000);
  });

  if (missingRequiredField) {
    redirect(withParams("/records/new", { error: `required_field_missing:${missingRequiredField.field_key}` }));
  }

  const { data: insertedRecord, error } = await supabase
    .from("operational_records")
    .insert({
      organization_id: null,
      farm_id: farmId,
      template_id: templateId,
      recorded_for_date: recordedForDate,
      created_by: user.id,
      record_status: recordStatus,
      submitted_at: recordStatus === "submitted" ? new Date().toISOString() : null,
      notes_summary: notesSummary || null
    })
    .select("id")
    .single();

  if (error) {
    redirect(withParams("/records/new", { error: error.code ?? "record_create_failed" }));
  }
  const insertedRecordId = insertedRecord?.id ?? null;

  const entries = templateFields
    .map((field) => parseTemplateFieldValue(formData, field))
    .filter(Boolean)
    .map((entry) => ({
      record_id: insertedRecordId,
      ...entry
    }));

  if (insertedRecordId && entries.length) {
    const { error: entriesError } = await supabase
      .from("record_entries")
      .insert(entries);

    if (entriesError) {
      redirect(withParams("/records/new", { error: entriesError.code ?? "record_entries_create_failed" }));
    }
  }

  redirect(withParams(`/records/${insertedRecordId}`, { record: recordStatus === "draft" ? "draft_saved" : "submitted" }));
}
