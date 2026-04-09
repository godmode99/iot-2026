"use client";

import { useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button.jsx";

const EMPTY_FIELD = {
  field_key: "",
  label: "",
  field_type: "text",
  unit: "",
  placeholder: "",
  is_required: false
};

function initialFields(template) {
  if (template?.fields?.length) {
    return template.fields.map((field) => ({
      field_key: field.key ?? "",
      label: field.label ?? "",
      field_type: field.type ?? "text",
      unit: field.unit ?? "",
      placeholder: field.placeholder ?? "",
      is_required: field.required === true
    }));
  }

  return [EMPTY_FIELD];
}

function msg(messages, path, fallback) {
  return path.split(".").reduce((value, segment) => value?.[segment], messages) ?? fallback;
}

export function RecordTemplateEditor({
  action,
  messages,
  template = null,
  farms = [],
  submitLabel,
  submitPendingLabel,
  cancelHref
}) {
  const [fields, setFields] = useState(initialFields(template));

  function updateField(index, key, value) {
    setFields((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  function addField() {
    setFields((current) => [...current, { ...EMPTY_FIELD }]);
  }

  function removeField(index) {
    setFields((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  return (
    <form action={action} className="form records-form-shell">
      {template?.id ? <input type="hidden" name="template_id" value={template.id} /> : null}

      <label>
        {msg(messages, "recordTemplateEditor.fields.code", "Template code")}
        <input defaultValue={template?.code ?? ""} name="code" placeholder="water_quality_round" required />
      </label>

      <label>
        {msg(messages, "recordTemplateEditor.fields.name", "Template name")}
        <input defaultValue={template?.name ?? ""} name="name" placeholder="Water Quality Round" required />
      </label>

      <label>
        {msg(messages, "recordTemplateEditor.fields.description", "Description")}
        <textarea
          defaultValue={template?.description ?? ""}
          name="description"
          rows={3}
          placeholder={msg(messages, "recordTemplateEditor.fields.descriptionPlaceholder", "Explain when this template should be used.")}
        />
      </label>

      <label className="settings-check-row">
        <span>{msg(messages, "recordTemplateEditor.fields.active", "Active template")}</span>
        <input defaultChecked={template?.is_active !== false} name="is_active" type="checkbox" value="true" />
      </label>

      <label>
        {msg(messages, "recordTemplateEditor.fields.scopeType", "Visibility scope")}
        <select defaultValue={template?.scope_type ?? "farm"} name="scope_type">
          <option value="farm">{msg(messages, "recordTemplateEditor.scopeOptions.farm", "Farm package")}</option>
          <option value="organization">{msg(messages, "recordTemplateEditor.scopeOptions.organization", "Organization-specific")}</option>
          <option value="global">{msg(messages, "recordTemplateEditor.scopeOptions.global", "Global")}</option>
        </select>
      </label>

      <label>
        {msg(messages, "recordTemplateEditor.fields.organizationId", "Organization ID")}
        <input defaultValue={template?.organization_id ?? ""} name="organization_id" placeholder="Optional organization UUID" />
      </label>

      <div className="notice">
        <strong>{msg(messages, "recordTemplateEditor.scopeNoticeTitle", "Scope rules")}</strong>
        <span> {msg(messages, "recordTemplateEditor.scopeNoticeBody", "Farm and global templates can be used in record entry right away. Organization-specific templates stay in the template layer until assignment rules are wired in.")}</span>
      </div>

      <div className="split-heading">
        <div>
          <p className="eyebrow">{msg(messages, "recordTemplateEditor.assignmentsEyebrow", "Farm assignments")}</p>
          <h2>{msg(messages, "recordTemplateEditor.assignmentsTitle", "Limit farm templates to specific farms when needed")}</h2>
        </div>
      </div>

      <div className="records-template-grid">
        {farms.map((farm) => {
          const defaultChecked = (template?.assigned_farm_ids ?? []).includes(farm.id);
          return (
            <label className="records-field-card" key={`farm-assignment-${farm.id}`}>
              <span>{farm.name}</span>
              <input defaultChecked={defaultChecked} name="assigned_farm_id" type="checkbox" value={farm.id} />
              <span className="muted">{msg(messages, "recordTemplateEditor.assignmentHint", "Leave all unchecked to keep the farm template available for every farm.")}</span>
            </label>
          );
        })}
      </div>

      <div className="split-heading">
        <div>
          <p className="eyebrow">{msg(messages, "recordTemplateEditor.fieldsEyebrow", "Template fields")}</p>
          <h2>{msg(messages, "recordTemplateEditor.fieldsTitle", "Define the structured fields")}</h2>
        </div>
        <button className="button-secondary" onClick={addField} type="button">
          {msg(messages, "recordTemplateEditor.addFieldAction", "Add field")}
        </button>
      </div>

      <div className="records-template-grid">
        {fields.map((field, index) => (
          <article className="records-field-card" key={`template-field-${index}`}>
            <label>
              <span>{msg(messages, "recordTemplateEditor.fieldRow.key", "Field key")}</span>
              <input
                name="field_key"
                onChange={(event) => updateField(index, "field_key", event.target.value)}
                placeholder="dissolved_oxygen_mg_l"
                required
                value={field.field_key}
              />
            </label>
            <label>
              <span>{msg(messages, "recordTemplateEditor.fieldRow.label", "Label")}</span>
              <input
                name="field_label"
                onChange={(event) => updateField(index, "label", event.target.value)}
                placeholder="Dissolved oxygen"
                required
                value={field.label}
              />
            </label>
            <label>
              <span>{msg(messages, "recordTemplateEditor.fieldRow.type", "Type")}</span>
              <select name="field_type" onChange={(event) => updateField(index, "field_type", event.target.value)} value={field.field_type}>
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>
            </label>
            <label>
              <span>{msg(messages, "recordTemplateEditor.fieldRow.unit", "Unit")}</span>
              <input
                name="field_unit"
                onChange={(event) => updateField(index, "unit", event.target.value)}
                placeholder="mg/L"
                value={field.unit}
              />
            </label>
            <label>
              <span>{msg(messages, "recordTemplateEditor.fieldRow.placeholder", "Placeholder")}</span>
              <input
                name="field_placeholder"
                onChange={(event) => updateField(index, "placeholder", event.target.value)}
                placeholder="5.8"
                value={field.placeholder}
              />
            </label>
            <label className="settings-check-row">
              <span>{msg(messages, "recordTemplateEditor.fieldRow.required", "Required")}</span>
              <input
                checked={field.is_required}
                name={`field_required_${index}`}
                onChange={(event) => updateField(index, "is_required", event.target.checked)}
                type="checkbox"
                value="true"
              />
            </label>
            <input name="field_required" type="hidden" value={field.is_required ? "true" : "false"} />
            <div className="action-row">
              <button className="button-secondary" onClick={() => removeField(index)} type="button">
                {msg(messages, "recordTemplateEditor.removeFieldAction", "Remove field")}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="split-heading">
        <div>
          <p className="eyebrow">{msg(messages, "recordTemplateEditor.previewEyebrow", "Preview")}</p>
          <h2>{msg(messages, "recordTemplateEditor.previewTitle", "How this template will look in record entry")}</h2>
        </div>
      </div>

      <div className="records-template-grid">
        {fields.filter((field) => field.field_key && field.label).map((field, index) => (
          <article className="records-field-card" key={`preview-${field.field_key}-${index}`}>
            <span>{field.label}</span>
            <strong>{field.field_key}</strong>
            <span className="muted">{field.field_type}{field.unit ? ` · ${field.unit}` : ""}</span>
            {field.placeholder ? <span className="muted">{field.placeholder}</span> : null}
            {field.is_required
              ? <span className="pill">{msg(messages, "recordTemplateEditor.previewRequired", "Required")}</span>
              : <span className="pill">{msg(messages, "recordTemplateEditor.previewOptional", "Optional")}</span>}
          </article>
        ))}
      </div>

      <div className="action-row">
        <SubmitButton pendingLabel={submitPendingLabel}>{submitLabel}</SubmitButton>
        <Link className="button-secondary" href={cancelHref}>
          {msg(messages, "recordTemplateEditor.cancelAction", "Cancel")}
        </Link>
      </div>
    </form>
  );
}
