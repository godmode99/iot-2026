import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadRecordTemplateCatalog } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";
import { cloneRecordTemplateAction } from "./actions.js";

export const dynamic = "force-dynamic";

function scopeLabel(template, messages) {
  if (template.scope_type === "global") {
    return t(messages, "recordTemplatesPage.scopeGlobal", "Global");
  }

  if (template.scope_type === "organization") {
    return t(messages, "recordTemplatesPage.scopeOrganization", "Organization");
  }

  return t(messages, "recordTemplatesPage.scopeFarm", "Farm package");
}

function availabilityLabel(template, messages) {
  if (template.is_active === false) {
    return t(messages, "recordTemplatesPage.availabilityArchived", "Archived");
  }

  if (template.scope_type === "organization") {
    return t(messages, "recordTemplatesPage.availabilityInternal", "Internal assignment");
  }

  return t(messages, "recordTemplatesPage.availabilityReady", "Ready for record entry");
}

export default async function RecordTemplatesPage() {
  const messages = await getMessages();
  await requireUser({ returnUrl: "/records/templates" });
  const catalog = await loadRecordTemplateCatalog();

  return (
    <AppShell currentPath="/records" ariaLabel="Record templates navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordTemplatesPage.eyebrow", "Record templates")}</p>
          <h1 className="page-title">{t(messages, "recordTemplatesPage.title", "Configurable templates for operational records")}</h1>
          <p className="lede">{t(messages, "recordTemplatesPage.body", "Use this catalog to review which templates exist, what fields they expose, and how the record layer is structured today.")}</p>
        </div>
        <div className="inline-actions">
          <Link className="button-secondary" href="/records">{t(messages, "recordTemplatesPage.backAction", "Back to records")}</Link>
          <Link className="button-secondary" href="/records/new">{t(messages, "recordTemplatesPage.createRecordAction", "Create record")}</Link>
          <Link className="button" href="/records/templates/new">{t(messages, "recordTemplatesPage.createAction", "New template")}</Link>
        </div>
      </section>

      {catalog.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "recordTemplatesPage.errorTitle", "Template data warnings")}</strong>
          <ul>
            {catalog.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-grid">
        {catalog.templates.map((template) => (
          <article className="card" key={template.id}>
            <div className="split-heading">
              <div>
                <p className="eyebrow">{template.code}</p>
                <h2>{template.name}</h2>
              </div>
              <div className="inline-actions">
                <span className="pill">{scopeLabel(template, messages)}</span>
                <span className="pill">{template.is_active === false ? t(messages, "recordTemplatesPage.archivedState", "Archived") : t(messages, "recordTemplatesPage.activeState", "Active")}</span>
                <span className="pill">{template.fields.length} {t(messages, "recordTemplatesPage.fieldCount", "fields")}</span>
                <form action={cloneRecordTemplateAction}>
                  <input type="hidden" name="template_id" value={template.id} />
                  <button className="button-secondary" type="submit">
                    {t(messages, "recordTemplatesPage.cloneAction", "Clone")}
                  </button>
                </form>
                <Link className="button-secondary" href={`/records/templates/${template.id}/edit`}>
                  {t(messages, "recordTemplatesPage.editAction", "Edit")}
                </Link>
              </div>
            </div>
            <p className="muted">{template.description ?? t(messages, "recordTemplatesPage.descriptionFallback", "No description added for this template yet.")}</p>
            <div className="records-template-meta-grid">
              <article className="records-template-meta-card">
                <span className="eyebrow">{t(messages, "recordTemplatesPage.availabilityLabel", "Availability")}</span>
                <strong>{availabilityLabel(template, messages)}</strong>
                <span className="muted">
                  {template.scope_type === "organization"
                    ? t(messages, "recordTemplatesPage.availabilityInternalBody", "Visible in the template layer, but not exposed in customer-facing record entry yet.")
                    : template.is_active === false
                      ? t(messages, "recordTemplatesPage.availabilityArchivedBody", "Archived templates stay in history and editor flows, but are hidden from new record entry.")
                      : t(messages, "recordTemplatesPage.availabilityReadyBody", "This template can be consumed by the current record entry flow.")}
                </span>
              </article>
              <article className="records-template-meta-card">
                <span className="eyebrow">{t(messages, "recordTemplatesPage.usageLabel", "Usage")}</span>
                <strong>{template.usage?.record_count ?? 0} {t(messages, "recordTemplatesPage.usageCount", "records")}</strong>
                <span className="muted">
                  {template.usage?.last_recorded_for_date
                    ? `${t(messages, "recordTemplatesPage.lastUsedLabel", "Last used")}: ${template.usage.last_recorded_for_date}`
                    : t(messages, "recordTemplatesPage.neverUsed", "No records have used this template yet.")}
                </span>
              </article>
              <article className="records-template-meta-card">
                <span className="eyebrow">{t(messages, "recordTemplatesPage.assignmentLabel", "Farm assignments")}</span>
                <strong>{template.assigned_farm_ids?.length ?? 0} {t(messages, "recordTemplatesPage.assignmentCount", "farms")}</strong>
                <span className="muted">
                  {template.assigned_farm_ids?.length
                    ? template.assigned_farms.map((assignment) => assignment.farm_name ?? assignment.farm_id).join(", ")
                    : t(messages, "recordTemplatesPage.assignmentFallback", "No farm restriction. This farm template is available across all farms.")}
                </span>
              </article>
            </div>
            {template.organization_id ? <p className="muted">{t(messages, "recordTemplatesPage.organizationLabel", "Organization")}: {template.organization_id}</p> : null}
            {template.fields.length ? (
              <div className="records-template-grid">
                {template.fields.map((field) => (
                  <article className="records-field-card" key={`${template.code}-${field.key}`}>
                    <span>{field.label}</span>
                    <strong>{field.key}</strong>
                    <span className="muted">{field.type}{field.unit ? ` · ${field.unit}` : ""}</span>
                    {field.placeholder ? <span className="muted">{field.placeholder}</span> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">{t(messages, "recordTemplatesPage.emptyFields", "This template has no configured fields yet.")}</p>
            )}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
