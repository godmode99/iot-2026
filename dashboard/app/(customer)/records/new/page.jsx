import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { OperationalRecordForm } from "@/components/operational-record-form.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOperationalRecordCreateContext } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";
import { createOperationalRecord } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function NewRecordPage({ searchParams }) {
  const messages = await getMessages();
  await requireUser({ returnUrl: "/records/new" });
  const query = await searchParams;
  const context = await loadOperationalRecordCreateContext();
  const feedback = typeof query?.error === "string" ? query.error : "";

  return (
    <AppShell currentPath="/records" ariaLabel="Record creation navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordCreatePage.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "recordCreatePage.title")}</h1>
          <p className="lede">{t(messages, "recordCreatePage.body")}</p>
        </div>
        <div className="inline-actions">
          <Link className="button-secondary" href="/records">{t(messages, "recordCreatePage.backAction")}</Link>
        </div>
      </section>

      {feedback ? (
        <section className="notice">
          <strong>{t(messages, "recordCreatePage.errorTitle", "Record form issue")}</strong>
          <span> {feedback}</span>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <div className="card">
          <div className="split-heading">
            <div>
              <p className="eyebrow">{t(messages, "recordCreatePage.templatesEyebrow")}</p>
              <h2>{t(messages, "recordCreatePage.templatesTitle")}</h2>
            </div>
          </div>
          <div className="records-template-grid">
            {context.templates.map((template) => (
              <article className="records-template-card" key={template.id}>
                <span className="pill">{template.code}</span>
                <h3>{template.name}</h3>
                <p className="muted">{template.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="split-heading">
            <div>
              <p className="eyebrow">{t(messages, "recordCreatePage.formEyebrow")}</p>
              <h2>{t(messages, "recordCreatePage.formTitle")}</h2>
            </div>
          </div>
          <OperationalRecordForm
            action={createOperationalRecord}
            cancelLabel={t(messages, "recordCreatePage.cancelAction")}
            context={context}
            draftLabel={t(messages, "recordCreatePage.saveDraftAction", "Save draft")}
            draftPendingLabel={t(messages, "recordCreatePage.saveDraftPendingAction", "Saving draft...")}
            messages={messages}
            note={t(messages, "recordCreatePage.nextStepNote")}
            submitLabel={t(messages, "recordCreatePage.submitAction")}
            submitPendingLabel={t(messages, "recordCreatePage.submitPendingAction", "Creating record...")}
          />
        </div>
      </section>
    </AppShell>
  );
}
