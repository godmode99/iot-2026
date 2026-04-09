import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { SubmitButton } from "@/components/submit-button.jsx";
import { getMessages, t } from "@/lib/i18n.js";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOpsOverview } from "@/lib/data/ops-overview.js";
import { saveOpsHandoffNote } from "./actions.js";

export const dynamic = "force-dynamic";

const FOLLOW_UPS_RETURN_TO = "/ops/follow-ups";
const FOLLOW_UP_SECTIONS = ["critical", "warning", "attention"];
const FOLLOW_UP_QUEUE_FILTERS = ["critical-alerts", "record-discipline", "device-attention", "contact-gap"];

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function handoffFreshness(value, messages) {
  if (!value) {
    return {
      className: "is-stale",
      label: t(messages, "ops.noHandoffYet", "No handoff yet")
    };
  }

  const ageMs = Date.now() - new Date(value).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays <= 1) {
    return {
      className: "is-online",
      label: t(messages, "ops.handoffFresh", "Fresh")
    };
  }

  if (ageDays <= 3) {
    return {
      className: "is-stale",
      label: t(messages, "ops.handoffRecent", "Recent")
    };
  }

  return {
    className: "is-offline",
    label: t(messages, "ops.handoffStale", "Stale")
  };
}

function groupQueue(items = []) {
  return {
    critical: items.filter((item) => item.priority === "critical"),
    warning: items.filter((item) => item.priority === "warning"),
    attention: items.filter((item) => item.priority !== "critical" && item.priority !== "warning")
  };
}

function sectionMeta(messages, key) {
  if (key === "critical") {
    return {
      title: t(messages, "ops.followUpSections.criticalTitle", "Critical first"),
      body: t(messages, "ops.followUpSections.criticalBody", "Start here when farms still have critical alerts or the risk of missed action is highest."),
      className: "is-offline"
    };
  }

  if (key === "warning") {
    return {
      title: t(messages, "ops.followUpSections.warningTitle", "Warnings and pressure"),
      body: t(messages, "ops.followUpSections.warningBody", "Use this section for device attention and discipline issues that can turn into incidents if they keep building."),
      className: "is-stale"
    };
  }

  return {
    title: t(messages, "ops.followUpSections.attentionTitle", "Admin and readiness"),
    body: t(messages, "ops.followUpSections.attentionBody", "Finish these items to make future alerts and workflows easier to operate."),
    className: "is-online"
  };
}

function followUpPresets(messages) {
  return [
    {
      key: "critical-triage",
      label: t(messages, "ops.followUpPresets.criticalTriage", "Critical triage"),
      view: "critical",
      queueFilter: "critical-alerts"
    },
    {
      key: "discipline-sweep",
      label: t(messages, "ops.followUpPresets.disciplineSweep", "Discipline sweep"),
      view: "warning",
      queueFilter: "record-discipline"
    },
    {
      key: "device-pressure",
      label: t(messages, "ops.followUpPresets.devicePressure", "Device pressure"),
      view: "warning",
      queueFilter: "device-attention"
    },
    {
      key: "readiness-cleanup",
      label: t(messages, "ops.followUpPresets.readinessCleanup", "Readiness cleanup"),
      view: "attention",
      queueFilter: "contact-gap"
    }
  ];
}

function withReturnTo(href, returnTo = FOLLOW_UPS_RETURN_TO) {
  if (!href || (!href.startsWith("/alerts") && !href.startsWith("/records"))) {
    return href;
  }

  const [pathname, queryString = ""] = href.split("?");
  const params = new URLSearchParams(queryString);
  params.set("return_to", returnTo);
  return `${pathname}?${params.toString()}`;
}

function normalizeView(value) {
  return FOLLOW_UP_SECTIONS.includes(value) ? value : "all";
}

function normalizeQueueFilter(value) {
  return FOLLOW_UP_QUEUE_FILTERS.includes(value) ? value : "all";
}

function buildWorkspaceUrl({ view = "all", queueFilter = "all", focusFarmId = "", focusAction = "", createdRecordId = "", updatedRecordId = "", updatedAlertId = "", farmSearch = "", pinnedFarmId = "" } = {}) {
  const params = new URLSearchParams();
  if (view && view !== "all") {
    params.set("view", view);
  }
  if (queueFilter && queueFilter !== "all") {
    params.set("queue", queueFilter);
  }
  if (focusFarmId) {
    params.set("focus_farm", focusFarmId);
  }
  if (focusAction) {
    params.set("focus_action", focusAction);
  }
  if (createdRecordId) {
    params.set("record_created", createdRecordId);
  }
  if (updatedRecordId) {
    params.set("record_updated", updatedRecordId);
  }
  if (updatedAlertId) {
    params.set("alert_updated", updatedAlertId);
  }
  if (farmSearch) {
    params.set("farm_search", farmSearch);
  }
  if (pinnedFarmId) {
    params.set("pin_farm", pinnedFarmId);
  }

  const query = params.toString();
  return query ? `${FOLLOW_UPS_RETURN_TO}?${query}` : FOLLOW_UPS_RETURN_TO;
}

function filterByFarmSearch(items = [], search = "") {
  const normalized = String(search ?? "").trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => String(item.farmName ?? "").toLowerCase().includes(normalized));
}

function filterByPinnedFarm(items = [], pinnedFarmId = "") {
  if (!pinnedFarmId) {
    return items;
  }

  return items.filter((item) => item.farmId === pinnedFarmId);
}

function filterByQueueCategory(items = [], queueFilter = "") {
  if (!queueFilter || queueFilter === "all") {
    return items;
  }

  return items.filter((item) => item.category === queueFilter);
}

function sortWithFocus(items = [], focusFarmId = "") {
  if (!focusFarmId) {
    return items;
  }

  return [...items].sort((left, right) => {
    const leftFocused = left.farmId === focusFarmId ? 1 : 0;
    const rightFocused = right.farmId === focusFarmId ? 1 : 0;
    return rightFocused - leftFocused;
  });
}

function applyCompletionSignal(items = [], focusFarmId = "", focusAction = "") {
  if (!focusFarmId || !focusAction) {
    return items;
  }

  return items.filter((item) => {
    if (item.farmId !== focusFarmId) {
      return true;
    }

    if (focusAction === "record_follow_up" && item.key === `${focusFarmId}-record-discipline`) {
      return false;
    }

    if (focusAction === "alert_follow_up" && item.key === `${focusFarmId}-critical-alerts`) {
      return false;
    }

    return true;
  });
}

export default async function OpsFollowUpsPage({ searchParams }) {
  const messages = await getMessages();
  const query = await searchParams;
  const { authConfigured, user } = await requireUser({ returnUrl: "/ops/follow-ups" });
  const ops = user ? await loadOpsOverview() : null;
  const focusFarmId = typeof query?.focus_farm === "string" ? query.focus_farm : "";
  const focusAction = typeof query?.focus_action === "string" ? query.focus_action : "";
  const activeView = normalizeView(typeof query?.view === "string" ? query.view : "");
  const queueFilter = normalizeQueueFilter(typeof query?.queue === "string" ? query.queue : "");
  const farmSearch = typeof query?.farm_search === "string" ? query.farm_search : "";
  const pinnedFarmId = typeof query?.pin_farm === "string" ? query.pin_farm : "";
  const queueItems = filterByPinnedFarm(
    filterByFarmSearch(
      filterByQueueCategory(
        applyCompletionSignal(ops?.followUpQueue ?? [], focusFarmId, focusAction),
        queueFilter
      ),
      farmSearch
    ),
    pinnedFarmId
  );
  const groups = groupQueue(queueItems);
  const createdRecordId = typeof query?.record_created === "string" ? query.record_created : "";
  const updatedRecordId = typeof query?.record_updated === "string" ? query.record_updated : "";
  const updatedAlertId = typeof query?.alert_updated === "string" ? query.alert_updated : "";
  const handoffSaved = typeof query?.handoff_saved === "string" ? query.handoff_saved : "";
  const handoffError = typeof query?.handoff_error === "string" ? query.handoff_error : "";
  const workspaceReturnTo = buildWorkspaceUrl({
    view: activeView,
    queueFilter,
    focusFarmId,
    focusAction,
    createdRecordId,
    updatedRecordId,
    updatedAlertId,
    farmSearch,
    pinnedFarmId
  });
  const focusedItems = queueItems.filter((item) => item.farmId === focusFarmId);
  const focusedItem = focusedItems[0] ?? null;
  const pinnedFarmName = pinnedFarmId
    ? (ops?.followUpQueue ?? []).find((item) => item.farmId === pinnedFarmId)?.farmName ?? pinnedFarmId
    : "";
  const visibleSections = activeView === "all" ? FOLLOW_UP_SECTIONS : [activeView];
  const presets = followUpPresets(messages);
  const handoffFarmId = pinnedFarmId || focusFarmId || "";
  const handoffFarmName = handoffFarmId
    ? (ops?.followUpQueue ?? []).find((item) => item.farmId === handoffFarmId)?.farmName
      ?? (ops?.farms ?? []).find((farm) => farm.id === handoffFarmId)?.name
      ?? handoffFarmId
    : "";
  const handoffContextItem = handoffFarmId
    ? queueItems.find((item) => item.farmId === handoffFarmId)
      ?? (ops?.followUpQueue ?? []).find((item) => item.farmId === handoffFarmId)
      ?? null
    : null;
  const handoffFreshnessState = handoffFreshness(handoffContextItem?.latestHandoff?.created_at, messages);

  return (
    <AppShell currentPath="/ops" ariaLabel="Ops navigation">
      {!authConfigured ? <section className="notice">{t(messages, "dashboard.authPending")}</section> : null}
      {createdRecordId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.recordCreatedTitle", "Record created")}</strong>
          <span> {t(messages, "ops.recordCreatedBody", "A new operational record was created from the reporting workflow.")} </span>
          <Link href={`/records/${createdRecordId}?return_to=${encodeURIComponent(workspaceReturnTo)}`}>{t(messages, "ops.openCreatedRecordAction", "Open record")}</Link>
        </section>
      ) : null}
      {updatedRecordId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.recordUpdatedTitle", "Record updated")}</strong>
          <span> {t(messages, "ops.recordUpdatedBody", "An operational record was updated and returned to the reporting workflow.")} </span>
          <Link href={`/records/${updatedRecordId}?return_to=${encodeURIComponent(workspaceReturnTo)}`}>{t(messages, "ops.openCreatedRecordAction", "Open record")}</Link>
        </section>
      ) : null}
      {updatedAlertId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.alertUpdatedTitle", "Alert updated")}</strong>
          <span> {t(messages, "ops.alertUpdatedBody", "An alert action was completed and returned to the reporting workflow.")} </span>
          <Link href={`/alerts/${updatedAlertId}?return_to=${encodeURIComponent(workspaceReturnTo)}`}>{t(messages, "ops.openUpdatedAlertAction", "Open alert")}</Link>
        </section>
      ) : null}
      {handoffSaved ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpHandoffSavedTitle", "Handoff note saved")}</strong>
          <span> {t(messages, "ops.followUpHandoffSavedBody", "The latest operator handoff note is now attached to this farm context.")}</span>
        </section>
      ) : null}
      {handoffError ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpHandoffErrorTitle", "Handoff note issue")}</strong>
          <span> {t(messages, `ops.followUpHandoffErrors.${handoffError}`, "The handoff note could not be saved from this workspace.")}</span>
        </section>
      ) : null}
      {focusedItem ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpFocusTitle", "Latest follow-up context")}</strong>
          <span> {t(messages, "ops.followUpFocusBody", "The queue below is focused on the farm you just worked on so you can confirm what still needs follow-up.")}</span>
          <span className="pill">{focusedItem.farmName}</span>
          <div className="action-row">
            <Link className="button-secondary" href={withReturnTo(focusedItem.primaryHref, workspaceReturnTo)}>{t(messages, "ops.followUpNextAction", "Next best action")}: {focusedItem.primaryLabel}</Link>
          </div>
        </section>
      ) : focusFarmId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpCompletedTitle", "Follow-up moved forward")}</strong>
          <span> {t(messages, "ops.followUpCompletedBody", "The matching follow-up item was cleared from the workspace for the farm you just handled.")}</span>
        </section>
      ) : null}
      {pinnedFarmId ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "ops.followUpPinnedTitle", "Farm pinned")}</strong>
          <span> {t(messages, "ops.followUpPinnedBody", "This workspace is currently focused on one farm only.")}</span>
          <span className="pill">{pinnedFarmName}</span>
          <div className="action-row">
            <Link className="button-secondary" href={buildWorkspaceUrl({ view: activeView, queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch })}>{t(messages, "ops.followUpUnpinAction", "Show all farms")}</Link>
          </div>
        </section>
      ) : null}
      {handoffFarmId ? (
        <section className="dashboard-card">
          <div className="split-heading">
            <div>
              <p className="eyebrow">{t(messages, "ops.followUpHandoffEyebrow", "Operator handoff")}</p>
              <h2>{t(messages, "ops.followUpHandoffTitle", "Leave context for the next person")}</h2>
              <p className="muted">{t(messages, "ops.followUpHandoffBody", "Capture what changed, what still looks risky, or what the next operator should check first.")}</p>
            </div>
            <span className="pill">{handoffFarmName}</span>
          </div>
          {handoffContextItem?.latestHandoff?.note ? (
            <div className="notice">
              <strong>{t(messages, "ops.followUpLatestHandoffTitle", "Latest note")}</strong>
              <span> {handoffContextItem.latestHandoff.note}</span>
              <span className={`pill ${handoffFreshnessState.className}`}>{handoffFreshnessState.label}</span>
              {handoffContextItem.latestHandoff.created_at ? (
                <span className="pill">{formatDateTime(handoffContextItem.latestHandoff.created_at)}</span>
              ) : null}
            </div>
          ) : null}
          {handoffContextItem?.handoffHistory?.length ? (
            <div>
              <p className="eyebrow">{t(messages, "ops.followUpHandoffHistoryEyebrow", "Recent handoff timeline")}</p>
              <ul className="status-list">
                {handoffContextItem.handoffHistory.map((entry) => (
                  <li className="mobile-list-row" key={entry.id}>
                    <span>
                      <strong>{entry.note}</strong>
                    </span>
                    <span className="list-meta">{formatDateTime(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <form action={saveOpsHandoffNote} className="records-filter-form">
            <input name="farm_id" type="hidden" value={handoffFarmId} />
            <input name="return_to" type="hidden" value={workspaceReturnTo} />
            <input name="view" type="hidden" value={activeView} />
            <input name="queue" type="hidden" value={queueFilter} />
            {pinnedFarmId ? <input name="pin_farm" type="hidden" value={pinnedFarmId} /> : null}
            <label>
              {t(messages, "ops.followUpHandoffFieldLabel", "Handoff note")}
              <textarea
                name="handoff_note"
                placeholder={t(messages, "ops.followUpHandoffPlaceholder", "Example: Critical alerts were reviewed. Salinity issue is calmer, but the next shift should verify the morning record and confirm farm contacts are up to date.")}
                rows={4}
              />
            </label>
            <div className="records-filter-actions">
              <SubmitButton pendingLabel={t(messages, "ops.followUpHandoffPendingAction", "Saving note...")}>
                {t(messages, "ops.followUpHandoffAction", "Save handoff note")}
              </SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="ops-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "ops.followUpWorkspaceEyebrow", "Operator workspace")}</p>
          <h1 className="page-title">{t(messages, "ops.followUpWorkspaceTitle", "Follow-up workspace")}</h1>
          <p className="lede">{t(messages, "ops.followUpWorkspaceBody", "Work through the current operator queue from highest-risk items down to admin cleanup without losing context.")}</p>
        </div>
        <div className="ops-hero-panel">
          <div className="metric-grid compact-grid">
            <article className="metric">
              <span className="muted">{t(messages, "ops.followUpSections.criticalTitle", "Critical first")}</span>
              <span className="metric-value">{groups.critical.length}</span>
            </article>
            <article className="metric">
              <span className="muted">{t(messages, "ops.followUpSections.warningTitle", "Warnings and pressure")}</span>
              <span className="metric-value">{groups.warning.length}</span>
            </article>
            <article className="metric">
              <span className="muted">{t(messages, "ops.followUpSections.attentionTitle", "Admin and readiness")}</span>
              <span className="metric-value">{groups.attention.length}</span>
            </article>
          </div>
          <div className="action-row">
            <Link className="button-secondary" href="/ops">{t(messages, "ops.backToOpsAction", "Back to ops")}</Link>
            <Link className="button-secondary" href="/ops/reports">{t(messages, "ops.openReportsAction", "Open reports")}</Link>
          </div>
          <div className="pill-row">
            <Link className={`pill ${activeView === "all" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: "all", queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpViews.all", "All follow-ups")}</Link>
            <Link className={`pill ${activeView === "critical" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: "critical", queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpSections.criticalTitle", "Critical first")}</Link>
            <Link className={`pill ${activeView === "warning" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: "warning", queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpSections.warningTitle", "Warnings and pressure")}</Link>
            <Link className={`pill ${activeView === "attention" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: "attention", queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpSections.attentionTitle", "Admin and readiness")}</Link>
          </div>
          <div className="pill-row">
            <Link className={`pill ${queueFilter === "all" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: activeView, queueFilter: "all", focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpQueues.all", "All queue types")}</Link>
            <Link className={`pill ${queueFilter === "critical-alerts" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: activeView, queueFilter: "critical-alerts", focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpQueues.criticalAlerts", "Critical alerts")}</Link>
            <Link className={`pill ${queueFilter === "record-discipline" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: activeView, queueFilter: "record-discipline", focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpQueues.recordDiscipline", "Record discipline")}</Link>
            <Link className={`pill ${queueFilter === "device-attention" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: activeView, queueFilter: "device-attention", focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpQueues.deviceAttention", "Device attention")}</Link>
            <Link className={`pill ${queueFilter === "contact-gap" ? "is-online" : ""}`} href={buildWorkspaceUrl({ view: activeView, queueFilter: "contact-gap", focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId })}>{t(messages, "ops.followUpQueues.contactGap", "Contact gaps")}</Link>
          </div>
          <div>
            <p className="eyebrow">{t(messages, "ops.followUpPresetsEyebrow", "Quick presets")}</p>
            <div className="pill-row">
              {presets.map((preset) => {
                const isActive = activeView === preset.view && queueFilter === preset.queueFilter;
                return (
                  <Link
                    className={`pill ${isActive ? "is-online" : ""}`}
                    href={buildWorkspaceUrl({
                      view: preset.view,
                      queueFilter: preset.queueFilter,
                      focusFarmId,
                      focusAction,
                      createdRecordId,
                      updatedRecordId,
                      updatedAlertId,
                      farmSearch,
                      pinnedFarmId
                    })}
                    key={preset.key}
                  >
                    {preset.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <form className="records-filter-form" method="get">
            {activeView !== "all" ? <input name="view" type="hidden" value={activeView} /> : null}
            {queueFilter !== "all" ? <input name="queue" type="hidden" value={queueFilter} /> : null}
            {focusFarmId ? <input name="focus_farm" type="hidden" value={focusFarmId} /> : null}
            {focusAction ? <input name="focus_action" type="hidden" value={focusAction} /> : null}
            {createdRecordId ? <input name="record_created" type="hidden" value={createdRecordId} /> : null}
            {updatedRecordId ? <input name="record_updated" type="hidden" value={updatedRecordId} /> : null}
            {updatedAlertId ? <input name="alert_updated" type="hidden" value={updatedAlertId} /> : null}
            {pinnedFarmId ? <input name="pin_farm" type="hidden" value={pinnedFarmId} /> : null}
            <label>
              {t(messages, "ops.followUpSearchLabel", "Search farm")}
              <input
                defaultValue={farmSearch}
                name="farm_search"
                placeholder={t(messages, "ops.followUpSearchPlaceholder", "Filter by farm name")}
                type="search"
              />
            </label>
            <div className="records-filter-actions">
              <button className="button" type="submit">{t(messages, "ops.followUpSearchAction", "Apply search")}</button>
              {farmSearch ? <Link className="button-secondary" href={buildWorkspaceUrl({ view: activeView, queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, pinnedFarmId })}>{t(messages, "ops.followUpSearchClearAction", "Clear search")}</Link> : null}
            </div>
          </form>
        </div>
      </section>

      {ops?.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "dashboard.dataWarnings")}</strong>
          <ul>
            {ops.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-grid">
        {visibleSections.map((key) => {
          const items = sortWithFocus(groups[key], focusFarmId);
          const meta = sectionMeta(messages, key);

          return (
            <article className="card" key={key}>
              <div className="split-heading">
                <div>
                  <h2>{meta.title}</h2>
                  <p className="muted">{meta.body}</p>
                </div>
                <span className={`pill ${meta.className}`}>{items.length}</span>
              </div>

              {items.length ? (
                <ul className="status-list">
                  {items.map((item) => (
                    <li className="mobile-list-row" key={item.key}>
                      <span>
                        <strong>{item.title}</strong>
                        <span className="list-meta">{item.farmName}</span>
                        <span className="list-meta">{item.body}</span>
                        {item.latestHandoff?.note ? (
                          <span className="list-meta">{t(messages, "ops.followUpLatestHandoffInline", "Latest handoff")}: {item.latestHandoff.note}</span>
                        ) : null}
                      </span>
                      <span className="pill-row">
                        <span className={`pill ${handoffFreshness(item.latestHandoff?.created_at, messages).className}`}>{handoffFreshness(item.latestHandoff?.created_at, messages).label}</span>
                        {item.farmId === focusFarmId ? <span className="pill is-online">{t(messages, "ops.followUpJustUpdated", "Just updated")}</span> : null}
                        {item.farmId === pinnedFarmId ? <span className="pill">{t(messages, "ops.followUpPinnedChip", "Pinned farm")}</span> : null}
                        <Link className="button-secondary" href={withReturnTo(item.primaryHref, workspaceReturnTo)}>{item.primaryLabel}</Link>
                        <Link className="button-secondary" href={withReturnTo(item.secondaryHref, workspaceReturnTo)}>{item.secondaryLabel}</Link>
                        {item.farmId !== pinnedFarmId ? (
                          <Link
                            className="button-secondary"
                            href={buildWorkspaceUrl({ view: activeView, queueFilter, focusFarmId, focusAction, createdRecordId, updatedRecordId, updatedAlertId, farmSearch, pinnedFarmId: item.farmId })}
                          >
                            {t(messages, "ops.followUpPinAction", "Pin farm")}
                          </Link>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t(messages, "ops.followUpWorkspaceEmpty", "No items are waiting in this section right now.")}</p>
              )}
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
