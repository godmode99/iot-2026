"use client";

import { useId, useState } from "react";

const INITIAL_FORM = {
  organizationType: "",
  organizationName: "",
  useCase: "",
  currentInputs: "",
  nearTermGoals: "",
  deploymentScope: ""
};

function buildBrief(form) {
  return [
    "Request demo brief",
    "",
    `Organization type: ${form.organizationType || "-"}`,
    `Organization name: ${form.organizationName || "-"}`,
    `Primary use case: ${form.useCase || "-"}`,
    `Current inputs: ${form.currentInputs || "-"}`,
    `Near-term goals: ${form.nearTermGoals || "-"}`,
    `Deployment scope: ${form.deploymentScope || "-"}`
  ].join("\n");
}

export function RequestDemoForm({ contactEmail, facebookPageUrl, labels }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [copied, setCopied] = useState(false);
  const briefId = useId();
  const brief = buildBrief(form);
  const mailtoHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(labels.emailSubject)}&body=${encodeURIComponent(brief)}`
    : "";

  function updateField(event) {
    const { name, value } = event.target;
    setCopied(false);
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="request-demo-form-shell" aria-labelledby={briefId}>
      <div className="home-section-heading">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h2 id={briefId}>{labels.title}</h2>
        <p className="muted">{labels.body}</p>
      </div>

      <div className="request-demo-form-layout">
        <form className="form request-demo-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>{labels.organizationType}</span>
            <select name="organizationType" value={form.organizationType} onChange={updateField}>
              <option value="">{labels.selectPlaceholder}</option>
              {labels.organizationOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{labels.organizationName}</span>
            <input
              name="organizationName"
              onChange={updateField}
              placeholder={labels.organizationNamePlaceholder}
              type="text"
              value={form.organizationName}
            />
          </label>

          <label>
            <span>{labels.useCase}</span>
            <textarea
              name="useCase"
              onChange={updateField}
              placeholder={labels.useCasePlaceholder}
              rows={4}
              value={form.useCase}
            />
          </label>

          <label>
            <span>{labels.currentInputs}</span>
            <textarea
              name="currentInputs"
              onChange={updateField}
              placeholder={labels.currentInputsPlaceholder}
              rows={4}
              value={form.currentInputs}
            />
          </label>

          <label>
            <span>{labels.nearTermGoals}</span>
            <textarea
              name="nearTermGoals"
              onChange={updateField}
              placeholder={labels.nearTermGoalsPlaceholder}
              rows={4}
              value={form.nearTermGoals}
            />
          </label>

          <label>
            <span>{labels.deploymentScope}</span>
            <input
              name="deploymentScope"
              onChange={updateField}
              placeholder={labels.deploymentScopePlaceholder}
              type="text"
              value={form.deploymentScope}
            />
          </label>
        </form>

        <aside className="request-demo-brief-panel">
          <div className="request-demo-brief-copy">
            <p className="eyebrow">{labels.previewEyebrow}</p>
            <h3>{labels.previewTitle}</h3>
            <p className="muted">{labels.previewBody}</p>
          </div>

          <textarea
            className="request-demo-brief"
            readOnly
            rows={12}
            value={brief}
          />

          <div className="action-row">
            {facebookPageUrl ? (
              <a className="button" href={facebookPageUrl} rel="noreferrer" target="_blank">
                {labels.facebookAction}
              </a>
            ) : null}
            {contactEmail ? (
              <a className={facebookPageUrl ? "button-secondary" : "button"} href={mailtoHref}>
                {labels.emailAction}
              </a>
            ) : (
              <button className={facebookPageUrl ? "button-secondary" : "button"} onClick={copyBrief} type="button">
                {copied ? labels.copiedAction : labels.copyAction}
              </button>
            )}
            <button className="button-secondary" onClick={copyBrief} type="button">
              {copied ? labels.copiedAction : labels.copyAction}
            </button>
          </div>

          <p className="muted request-demo-note">
            {facebookPageUrl && contactEmail
              ? labels.contactReady
              : contactEmail
                ? labels.emailReady
                : facebookPageUrl
                  ? labels.facebookReady
                  : labels.emailMissing}
          </p>
        </aside>
      </div>
    </section>
  );
}
