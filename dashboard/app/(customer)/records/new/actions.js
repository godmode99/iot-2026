"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards.js";
import { withParams } from "@/lib/auth/urls.js";
import { OPERATIONAL_RECORD_FIELD_DEFINITIONS } from "@/lib/data/operational-records.js";
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

  const { data: insertedRecord, error } = await supabase
    .from("operational_records")
    .insert({
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

  const entries = OPERATIONAL_RECORD_FIELD_DEFINITIONS.flatMap((field, index) => {
    if (field.type === "number") {
      const valueNumber = optionalNumber(formData.get(field.key));
      if (valueNumber === null) {
        return [];
      }

      return [{
        record_id: insertedRecordId,
        field_key: field.key,
        field_type: field.type,
        label: field.label,
        value_number: valueNumber,
        unit: field.unit ?? null,
        sort_order: index
      }];
    }

    if (field.type === "boolean") {
      const valueBoolean = optionalBoolean(formData.get(field.key));
      if (valueBoolean === null) {
        return [];
      }

      return [{
        record_id: insertedRecordId,
        field_key: field.key,
        field_type: field.type,
        label: field.label,
        value_boolean: valueBoolean,
        unit: null,
        sort_order: index
      }];
    }

    const valueText = text(formData.get(field.key), 1000);
    if (!valueText) {
      return [];
    }

    return [{
      record_id: insertedRecordId,
      field_key: field.key,
      field_type: field.type,
      label: field.label,
      value_text: valueText,
      unit: field.unit ?? null,
      sort_order: index
    }];
  });

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
