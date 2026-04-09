import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { OperationalRecordForm } from "@/components/operational-record-form.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOperationalRecordEditContext } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";
import { updateOperationalRecord } from "./actions.js";

export const dynamic = "force-dynamic";

function resolveRecordFeedback(messages, feedback) {
  if (!feedback) {
    return "";
  }

  if (feedback.startsWith("required_field_missing:")) {
    const fieldKey = feedback.split(":")[1] ?? "";
    const fieldLabel = t(messages, `recordCreatePage.fieldsMap.${fieldKey}`, fieldKey || "field");
    return t(messages, "recordEditPage.errors.requiredFieldMissing", `Please complete the required field: ${fieldLabel}.`).replace("{field}", fieldLabel);
  }

  return t(messages, `recordEditPage.errors.${feedback}`, feedback);
}

export default async function EditRecordPage({ params, searchParams }) {
  const messages = await getMessages();
  const { recordId } = await params;
  const query = await searchParams;
  const returnTo = typeof query?.return_to === "string" ? query.return_to : "";

  await requireUser({ returnUrl: `/records/${recordId}/edit` });
  const context = await loadOperationalRecordEditContext({ recordId });
  const feedback = typeof query?.error === "string" ? query.error : "";
  const feedbackMessage = resolveRecordFeedback(messages, feedback);

  return (
    <AppShell currentPath="/records" ariaLabel="Operational record edit navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordEditPage.eyebrow", "Edit operational record")}</p>
          <h1 className="page-title">
            {context.record?.record_templates?.name ?? t(messages, "recordEditPage.titleFallback", "Edit record")}
          </h1>
          <p className="lede">
            {t(
              messages,
              "recordEditPage.body",
              "Update the record header and structured values so the history stays accurate and reusable."
            )}
          </p>
        </div>
        <div className="inline-actions">
          <Link className="button-secondary" href={returnTo || `/records/${recordId}`}>{returnTo ? t(messages, "recordEditPage.backToReportAction", "Back to report") : t(messages, "recordEditPage.backAction", "Back to record")}</Link>
        </div>
      </section>

      {feedbackMessage ? (
        <section className="notice">
          <strong>{t(messages, "recordEditPage.errorTitle", "Record form issue")}</strong>
          <span> {feedbackMessage}</span>
        </section>
      ) : null}

      {context.errors.length ? (
        <section className="notice">
          <strong>{t(messages, "recordsPage.dataWarnings", "Records data warnings")}</strong>
          <ul>
            {context.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      {context.record ? (
        <section className="dashboard-grid">
          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "recordEditPage.contextEyebrow", "Current context")}</p>
                <h2>{t(messages, "recordEditPage.contextTitle", "Editing this record")}</h2>
              </div>
            </div>
            <div className="records-field-group-grid">
              <article className="records-field-group-card">
                <h3>{t(messages, "recordEditPage.contextCards.status", "Status")}</h3>
                <p>{context.record.record_status ?? "submitted"}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "recordEditPage.contextCards.farm", "Farm")}</h3>
                <p>{context.record.farms?.name ?? "N/A"}</p>
              </article>
              <article className="records-field-group-card">
                <h3>{t(messages, "recordEditPage.contextCards.template", "Template")}</h3>
                <p>{context.record.record_templates?.name ?? "N/A"}</p>
              </article>
            </div>
          </div>

          <div className="card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">{t(messages, "recordEditPage.formEyebrow", "Edit flow")}</p>
                <h2>{t(messages, "recordEditPage.formTitle", "Update structured values")}</h2>
              </div>
            </div>
            <OperationalRecordForm
              action={updateOperationalRecord}
              cancelHref={returnTo || `/records/${recordId}`}
              cancelLabel={t(messages, "recordEditPage.cancelAction", "Cancel")}
              context={context}
              draftLabel={t(messages, "recordEditPage.saveDraftAction", "Save as draft")}
              draftPendingLabel={t(messages, "recordEditPage.saveDraftPendingAction", "Saving draft...")}
              hiddenValues={returnTo ? { record_id: recordId, return_to: returnTo } : { record_id: recordId }}
              messages={messages}
              note={t(messages, "recordEditPage.nextStepNote", "Editing overwrites the stored structured entries for this record.")}
              submitLabel={t(messages, "recordEditPage.submitAction", "Save changes")}
              submitPendingLabel={t(messages, "recordEditPage.submitPendingAction", "Saving changes...")}
            />
          </div>
        </section>
      ) : (
        <section className="empty-panel dashboard-card">
          <div>
            <p className="eyebrow">{t(messages, "recordEditPage.missingEyebrow", "Record unavailable")}</p>
            <h2>{t(messages, "recordEditPage.missingTitle", "Record unavailable")}</h2>
            <p className="muted">{t(messages, "recordEditPage.missingBody", "This record cannot be edited in the current workspace.")}</p>
          </div>
          <div className="action-row">
            <Link className="button" href="/records">{t(messages, "recordEditPage.recordsAction", "Back to records")}</Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
