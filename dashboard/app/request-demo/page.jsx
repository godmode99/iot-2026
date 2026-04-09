import Link from "next/link";
import { RequestDemoForm } from "@/components/request-demo-form.jsx";
import {
  getContactEmail,
  getContactPhone,
  getFacebookPageUrl,
  getLineContactUrl
} from "@/lib/env.js";
import { getMessages, t } from "@/lib/i18n.js";

export const metadata = {
  title: "Request Demo | ArayaShiki Lab"
};

export default async function RequestDemoPage() {
  const messages = await getMessages();
  const contactEmail = getContactEmail();
  const contactPhone = getContactPhone();
  const facebookPageUrl = getFacebookPageUrl();
  const lineContactUrl = getLineContactUrl();
  const paths = ["research", "operations", "enterprise"].map((item) => ({
    title: t(messages, `requestDemoPage.paths.${item}.title`),
    body: t(messages, `requestDemoPage.paths.${item}.body`)
  }));
  const checklist = ["workflow", "inputs", "outcomes", "scale"].map((item) => ({
    title: t(messages, `requestDemoPage.checklist.${item}.title`),
    body: t(messages, `requestDemoPage.checklist.${item}.body`)
  }));
  const formLabels = {
    eyebrow: t(messages, "requestDemoPage.formEyebrow"),
    title: t(messages, "requestDemoPage.formTitle"),
    body: t(messages, "requestDemoPage.formBody"),
    organizationType: t(messages, "requestDemoPage.form.organizationType"),
    organizationName: t(messages, "requestDemoPage.form.organizationName"),
    organizationNamePlaceholder: t(messages, "requestDemoPage.form.organizationNamePlaceholder"),
    useCase: t(messages, "requestDemoPage.form.useCase"),
    useCasePlaceholder: t(messages, "requestDemoPage.form.useCasePlaceholder"),
    currentInputs: t(messages, "requestDemoPage.form.currentInputs"),
    currentInputsPlaceholder: t(messages, "requestDemoPage.form.currentInputsPlaceholder"),
    nearTermGoals: t(messages, "requestDemoPage.form.nearTermGoals"),
    nearTermGoalsPlaceholder: t(messages, "requestDemoPage.form.nearTermGoalsPlaceholder"),
    deploymentScope: t(messages, "requestDemoPage.form.deploymentScope"),
    deploymentScopePlaceholder: t(messages, "requestDemoPage.form.deploymentScopePlaceholder"),
    selectPlaceholder: t(messages, "requestDemoPage.form.selectPlaceholder"),
    organizationOptions: t(messages, "requestDemoPage.form.organizationOptions", []),
    previewEyebrow: t(messages, "requestDemoPage.form.previewEyebrow"),
    previewTitle: t(messages, "requestDemoPage.form.previewTitle"),
    previewBody: t(messages, "requestDemoPage.form.previewBody"),
    copyAction: t(messages, "requestDemoPage.form.copyAction"),
    copiedAction: t(messages, "requestDemoPage.form.copiedAction"),
    facebookAction: t(messages, "requestDemoPage.form.facebookAction"),
    lineAction: t(messages, "requestDemoPage.form.lineAction"),
    emailAction: t(messages, "requestDemoPage.form.emailAction"),
    facebookReady: t(messages, "requestDemoPage.form.facebookReady"),
    socialReady: t(messages, "requestDemoPage.form.socialReady"),
    allReady: t(messages, "requestDemoPage.form.allReady"),
    contactReady: t(messages, "requestDemoPage.form.contactReady"),
    emailReady: t(messages, "requestDemoPage.form.emailReady"),
    emailMissing: t(messages, "requestDemoPage.form.emailMissing"),
    emailSubject: t(messages, "requestDemoPage.form.emailSubject"),
    phoneLabel: t(messages, "requestDemoPage.form.phoneLabel")
  };

  return (
    <main className="page-shell solutions-shell">
      <nav className="topbar" aria-label="Request demo">
        <Link className="brand brand-wordmark" href="/" aria-label={t(messages, "brand.name")}>
          <span className="brand-wordmark-main">ArayaShiki</span>
          <span className="brand-wordmark-sep" aria-hidden="true" />
          <span className="brand-wordmark-sub">Lab</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/">{t(messages, "requestDemoPage.nav.home")}</Link>
          <Link className="nav-link" href="/solutions">{t(messages, "requestDemoPage.nav.solutions")}</Link>
          <Link className="nav-link" href="/packages">{t(messages, "requestDemoPage.nav.packages")}</Link>
          <Link className="button-secondary" href="/login">{t(messages, "nav.login")}</Link>
        </div>
      </nav>

      <section className="solutions-hero">
        <div className="solutions-hero-copy">
          <p className="eyebrow">{t(messages, "requestDemoPage.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "requestDemoPage.title")}</h1>
          <p className="lede">{t(messages, "requestDemoPage.body")}</p>
          <div className="action-row">
            <Link className="button" href="/packages">{t(messages, "requestDemoPage.primary")}</Link>
            <Link className="button-secondary" href="/login">{t(messages, "requestDemoPage.secondary")}</Link>
          </div>
        </div>
        <aside className="solutions-highlight">
          <p className="eyebrow">{t(messages, "requestDemoPage.highlightEyebrow")}</p>
          <h2>{t(messages, "requestDemoPage.highlightTitle")}</h2>
          <p className="muted">{t(messages, "requestDemoPage.highlightBody")}</p>
        </aside>
      </section>

      <section className="solutions-track-section" aria-labelledby="demo-paths-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "requestDemoPage.pathsEyebrow")}</p>
          <h2 id="demo-paths-title">{t(messages, "requestDemoPage.pathsTitle")}</h2>
          <p className="muted">{t(messages, "requestDemoPage.pathsBody")}</p>
        </div>
        <div className="solutions-track-grid">
          {paths.map((item) => (
            <article className="solutions-track-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions-layer-section" aria-labelledby="demo-checklist-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "requestDemoPage.checklistEyebrow")}</p>
          <h2 id="demo-checklist-title">{t(messages, "requestDemoPage.checklistTitle")}</h2>
          <p className="muted">{t(messages, "requestDemoPage.checklistBody")}</p>
        </div>
        <div className="request-demo-grid">
          {checklist.map((item) => (
            <article className="request-demo-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <RequestDemoForm
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        facebookPageUrl={facebookPageUrl}
        labels={formLabels}
        lineContactUrl={lineContactUrl}
      />

      <section className="request-demo-panel" aria-labelledby="demo-template-title">
        <div className="home-section-heading">
          <p className="eyebrow">{t(messages, "requestDemoPage.templateEyebrow")}</p>
          <h2 id="demo-template-title">{t(messages, "requestDemoPage.templateTitle")}</h2>
          <p className="muted">{t(messages, "requestDemoPage.templateBody")}</p>
        </div>
        <div className="request-demo-template">
          <p><strong>{t(messages, "requestDemoPage.template.lines.organization.label")}</strong> {t(messages, "requestDemoPage.template.lines.organization.value")}</p>
          <p><strong>{t(messages, "requestDemoPage.template.lines.useCase.label")}</strong> {t(messages, "requestDemoPage.template.lines.useCase.value")}</p>
          <p><strong>{t(messages, "requestDemoPage.template.lines.inputs.label")}</strong> {t(messages, "requestDemoPage.template.lines.inputs.value")}</p>
          <p><strong>{t(messages, "requestDemoPage.template.lines.goals.label")}</strong> {t(messages, "requestDemoPage.template.lines.goals.value")}</p>
          <p><strong>{t(messages, "requestDemoPage.template.lines.nextStep.label")}</strong> {t(messages, "requestDemoPage.template.lines.nextStep.value")}</p>
        </div>
      </section>

      <section className="home-cta-panel">
        <div>
          <p className="eyebrow">{t(messages, "requestDemoPage.ctaEyebrow")}</p>
          <h2>{t(messages, "requestDemoPage.ctaTitle")}</h2>
          <p className="muted">{t(messages, "requestDemoPage.ctaBody")}</p>
        </div>
        <div className="action-row">
          <Link className="button" href="/packages">{t(messages, "requestDemoPage.ctaPrimary")}</Link>
          <Link className="button-secondary" href="/">{t(messages, "requestDemoPage.ctaSecondary")}</Link>
        </div>
      </section>
    </main>
  );
}
