"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button.jsx";

const FIELD_GROUPS = [
  {
    title: "Context",
    body: "Farm, hatchery, tank, batch, and who is recording the work."
  },
  {
    title: "Measurements",
    body: "Structured values such as water parameters, counts, or checklist completion."
  },
  {
    title: "Observations",
    body: "Short notes that explain what happened and what follow-up is needed."
  }
];

function resolveVisibleFields(context, activeTemplateId) {
  const templates = context.templates ?? [];
  const fieldCatalog = context.fieldCatalog ?? context.fields ?? [];
  const templateFieldMap = context.templateFieldMap ?? {};
  const templateFieldGroups = context.templateFieldGroups ?? {};
  const activeTemplate = templates.find((template) => template.id === activeTemplateId) ?? templates[0] ?? null;

  if (activeTemplate?.code && templateFieldGroups[activeTemplate.code]?.length) {
    return templateFieldGroups[activeTemplate.code];
  }

  const allowedKeys = templateFieldMap[activeTemplate?.code] ?? fieldCatalog.map((field) => field.key);

  return fieldCatalog.filter((field) => allowedKeys.includes(field.key));
}

function message(messages, key, fallback = key) {
  return key.split(".").reduce((value, segment) => value?.[segment], messages) ?? fallback;
}

function isTemplateAvailableForFarm(template, farmId) {
  if (!template || template.is_active === false) {
    return false;
  }

  if (template.scope_type === "organization") {
    return false;
  }

  if (template.scope_type !== "farm") {
    return true;
  }

  const assignedFarmIds = template.assigned_farm_ids ?? [];
  if (!assignedFarmIds.length) {
    return true;
  }

  if (!farmId) {
    return true;
  }

  return assignedFarmIds.includes(farmId);
}

export function OperationalRecordForm({
  action,
  messages,
  context,
  submitLabel,
  submitPendingLabel,
  draftLabel,
  draftPendingLabel,
  cancelHref = "/records",
  cancelLabel,
  note,
  hiddenValues = {}
}) {
  const fieldValues = context.fieldValues ?? {};
  const [activeTemplateId, setActiveTemplateId] = useState(context.record?.template_id ?? context.defaultTemplateId ?? "");
  const [selectedFarmId, setSelectedFarmId] = useState(context.record?.farm_id ?? context.defaultFarmId ?? "");
  const availableTemplates = useMemo(
    () => (context.templates ?? []).filter((template) => isTemplateAvailableForFarm(template, selectedFarmId)),
    [context.templates, selectedFarmId]
  );
  const visibleTemplateOptions = availableTemplates.length ? availableTemplates : (context.templates ?? []);

  const visibleFields = useMemo(
    () => resolveVisibleFields({ ...context, templates: visibleTemplateOptions }, activeTemplateId),
    [activeTemplateId, context, visibleTemplateOptions]
  );

  return (
    <form action={action} className="form records-form-shell">
        {Object.entries(hiddenValues).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <label>
        {message(messages, "recordCreatePage.fields.farm", "Farm")}
        <select
          defaultValue={context.record?.farm_id ?? context.defaultFarmId ?? ""}
          name="farm_id"
          onChange={(event) => {
            const nextFarmId = event.target.value;
            setSelectedFarmId(nextFarmId);

            const nextTemplates = (context.templates ?? []).filter((template) => isTemplateAvailableForFarm(template, nextFarmId));
            if (!nextTemplates.some((template) => template.id === activeTemplateId)) {
              setActiveTemplateId(nextTemplates[0]?.id ?? "");
            }
          }}
          required
        >
          <option disabled value="">{message(messages, "recordCreatePage.fields.farmPlaceholder", "Choose a farm")}</option>
          {context.farms.map((farm) => (
            <option key={farm.id} value={farm.id}>{farm.name}</option>
          ))}
        </select>
      </label>

      <label>
        {message(messages, "recordCreatePage.fields.template", "Record template")}
        <select
          value={activeTemplateId}
          name="template_id"
          onChange={(event) => setActiveTemplateId(event.target.value)}
          required
        >
          <option disabled value="">{message(messages, "recordCreatePage.fields.selectPlaceholder", "Choose a template")}</option>
          {visibleTemplateOptions.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>

        {selectedFarmId && !availableTemplates.length ? (
          <p className="muted">{message(messages, "recordCreatePage.noFarmTemplates", "No active templates are assigned to this farm yet.")}</p>
        ) : null}

      <label>
        {message(messages, "recordCreatePage.fields.recordedDate", "Recorded for date")}
        <input defaultValue={context.record?.recorded_for_date ?? context.defaultRecordedForDate ?? ""} name="recorded_for_date" required type="date" />
      </label>

      <label>
        {message(messages, "recordCreatePage.fields.summary", "Summary notes")}
        <textarea
          defaultValue={context.record?.notes_summary ?? context.defaultSummary ?? ""}
          name="notes_summary"
          rows={4}
          placeholder={message(
            messages,
            "recordCreatePage.fields.summaryPlaceholder",
            "Describe the key observation, work done, or result that should appear in record history."
          )}
        />
      </label>

      <div className="records-field-group-grid">
        {FIELD_GROUPS.map((group) => (
          <article className="records-field-group-card" key={group.title}>
            <h3>{group.title}</h3>
            <p className="muted">{group.body}</p>
          </article>
        ))}
      </div>

      <div className="records-template-grid">
        {visibleFields.map((field) => (
          <label className="records-field-card" key={field.key}>
            <span>
              {message(messages, `recordCreatePage.fieldsMap.${field.key}`, field.label)}
              {field.required ? " *" : ""}
            </span>
            {field.type === "number" ? (
              <input
                defaultValue={fieldValues[field.key] ?? ""}
                name={field.key}
                placeholder={field.placeholder ?? ""}
                required={field.required === true}
                step="0.1"
                type="number"
              />
            ) : null}
            {field.type === "text" ? (
              <textarea
                defaultValue={fieldValues[field.key] ?? ""}
                name={field.key}
                placeholder={field.placeholder ?? ""}
                required={field.required === true}
                rows={3}
              />
            ) : null}
            {field.type === "boolean" ? (
              <select defaultValue={fieldValues[field.key] ?? ""} name={field.key} required={field.required === true}>
                <option value="">{message(messages, "recordCreatePage.fields.booleanPlaceholder", "Select status")}</option>
                <option value="true">{message(messages, "recordCreatePage.fields.booleanTrue", "Completed")}</option>
              </select>
            ) : null}
            {field.unit ? <span className="muted">{field.unit}</span> : null}
            {field.required ? <span className="pill">{message(messages, "recordCreatePage.requiredField", "Required")}</span> : null}
          </label>
        ))}
      </div>

      <div className="action-row">
        <SubmitButton name="record_status" pendingLabel={submitPendingLabel} value="submitted">
          {submitLabel}
        </SubmitButton>
        {draftLabel ? (
          <SubmitButton className="button-secondary" name="record_status" pendingLabel={draftPendingLabel} value="draft">
            {draftLabel}
          </SubmitButton>
        ) : null}
        <Link className="button-secondary" href={cancelHref}>{cancelLabel}</Link>
      </div>

      {note ? <p className="muted">{note}</p> : null}
    </form>
  );
}
