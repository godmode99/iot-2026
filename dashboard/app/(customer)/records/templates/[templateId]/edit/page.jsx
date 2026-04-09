import { AppShell } from "@/components/app-shell.jsx";
import { RecordTemplateEditor } from "@/components/record-template-editor.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadRecordTemplateEditorContext } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";
import { submitRecordTemplateAction, toggleRecordTemplateArchiveAction } from "../../actions.js";

export const dynamic = "force-dynamic";

export default async function EditRecordTemplatePage({ params, searchParams }) {
  const messages = await getMessages();
  const { templateId } = await params;
  const query = await searchParams;
  await requireUser({ returnUrl: `/records/templates/${templateId}/edit` });
  const context = await loadRecordTemplateEditorContext({ templateId });
  const error = typeof query?.error === "string" ? query.error : "";

  return (
    <AppShell currentPath="/records" ariaLabel="Record template editor navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordTemplateEditor.editEyebrow", "Edit template")}</p>
          <h1 className="page-title">{context.template?.name ?? t(messages, "recordTemplateEditor.missingTitle", "Template unavailable")}</h1>
          <p className="lede">{t(messages, "recordTemplateEditor.editBody", "Update the template header and structured fields so future records follow the right shape.")}</p>
        </div>
        {context.template ? (
          <form action={toggleRecordTemplateArchiveAction} className="inline-actions">
            <input type="hidden" name="template_id" value={context.template.id} />
            <input type="hidden" name="archived" value={context.template.is_active === false ? "false" : "true"} />
            <button className="button-secondary" type="submit">
              {context.template.is_active === false
                ? t(messages, "recordTemplateEditor.unarchiveAction", "Unarchive template")
                : t(messages, "recordTemplateEditor.archiveAction", "Archive template")}
            </button>
          </form>
        ) : null}
      </section>

      {error ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "recordTemplateEditor.errorTitle", "Template workflow issue")}</strong>
          <span> {error}</span>
        </section>
      ) : null}

      {context.template ? (
        <section className="card dashboard-card">
          <RecordTemplateEditor
            action={submitRecordTemplateAction}
            cancelHref="/records/templates"
            farms={context.farms ?? []}
            messages={messages}
            submitLabel={t(messages, "recordTemplateEditor.saveAction", "Save changes")}
            submitPendingLabel={t(messages, "recordTemplateEditor.savePendingAction", "Saving changes...")}
            template={context.template}
          />
        </section>
      ) : (
        <section className="empty-panel dashboard-card">
          <div>
            <p className="eyebrow">{t(messages, "recordTemplateEditor.missingEyebrow", "Template unavailable")}</p>
            <h2>{t(messages, "recordTemplateEditor.missingTitle", "Template unavailable")}</h2>
            <p className="muted">{t(messages, "recordTemplateEditor.missingBody", "This template is not visible in the current workspace.")}</p>
          </div>
        </section>
      )}
    </AppShell>
  );
}
