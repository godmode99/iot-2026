import { AppShell } from "@/components/app-shell.jsx";
import { RecordTemplateEditor } from "@/components/record-template-editor.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOperationalRecordCreateContext } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";
import { submitRecordTemplateAction } from "../actions.js";

export const dynamic = "force-dynamic";

export default async function NewRecordTemplatePage() {
  const messages = await getMessages();
  await requireUser({ returnUrl: "/records/templates/new" });
  const context = await loadOperationalRecordCreateContext();

  return (
    <AppShell currentPath="/records" ariaLabel="Record template editor navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordTemplateEditor.newEyebrow", "New template")}</p>
          <h1 className="page-title">{t(messages, "recordTemplateEditor.newTitle", "Create a record template")}</h1>
          <p className="lede">{t(messages, "recordTemplateEditor.newBody", "Define the template header and structured fields that records should use.")}</p>
        </div>
      </section>

      <section className="card dashboard-card">
        <RecordTemplateEditor
          action={submitRecordTemplateAction}
          cancelHref="/records/templates"
          farms={context.farms ?? []}
          messages={messages}
          submitLabel={t(messages, "recordTemplateEditor.createAction", "Save template")}
          submitPendingLabel={t(messages, "recordTemplateEditor.createPendingAction", "Saving template...")}
        />
      </section>
    </AppShell>
  );
}
