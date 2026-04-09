import Link from "next/link";
import { AppShell } from "@/components/app-shell.jsx";
import { requireUser } from "@/lib/auth/guards.js";
import { loadOperationalRecordsOverview } from "@/lib/data/operational-records.js";
import { getMessages, t } from "@/lib/i18n.js";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

export default async function RecordsPage({ searchParams }) {
  const messages = await getMessages();
  const query = await searchParams;
  const farmId = typeof query?.farm === "string" ? query.farm : "";
  const status = typeof query?.status === "string" ? query.status : "";
  const search = typeof query?.q === "string" ? query.q : "";
  const dateRange = typeof query?.dateRange === "string" ? query.dateRange : "";
  const returnTo = typeof query?.return_to === "string" ? query.return_to : "";

  await requireUser({ returnUrl: "/records" });
  const overview = await loadOperationalRecordsOverview({
    farmId,
    status,
    search,
    dateRange
  });
  const feedback = typeof query?.record === "string" ? query.record : "";
  const hasFilters = Boolean(overview.filters?.farmId || overview.filters?.status || overview.filters?.search || overview.filters?.dateRange !== "30d");
  const draftRecords = overview.records.filter((record) => record.record_status === "draft");

  return (
    <AppShell currentPath="/records" ariaLabel="Records navigation">
      <section className="dashboard-hero dashboard-card">
        <div>
          <p className="eyebrow">{t(messages, "recordsPage.eyebrow")}</p>
          <h1 className="page-title">{t(messages, "recordsPage.title")}</h1>
          <p className="lede">{t(messages, "recordsPage.body")}</p>
        </div>
        {returnTo ? (
          <div className="inline-actions">
            <Link className="button-secondary" href={returnTo}>{t(messages, "recordsPage.backToReportAction", "Back to report")}</Link>
          </div>
        ) : null}
        <div className="metric-grid dashboard-metrics">
          <div className="metric metric-emphasis">
            <span className="metric-value">{overview.stats.submitted}</span>
            <span className="muted">{t(messages, "recordsPage.metrics.submitted")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{overview.stats.drafts}</span>
            <span className="muted">{t(messages, "recordsPage.metrics.drafts")}</span>
          </div>
          <div className="metric">
            <span className="metric-value">{overview.stats.templates}</span>
            <span className="muted">{t(messages, "recordsPage.metrics.templates")}</span>
          </div>
        </div>
      </section>

      {feedback ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "recordsPage.noticeTitle", "Record status")}</strong>
          <span> {feedback}</span>
        </section>
      ) : null}

      {overview.errors.length ? (
        <section className="notice dashboard-card">
          <strong>{t(messages, "recordsPage.dataWarnings")}</strong>
          <ul>
            {overview.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-actions-grid dashboard-card" aria-label="Records actions">
        <Link className="action-card" href={returnTo ? `/records/new?return_to=${encodeURIComponent(returnTo)}` : "/records/new"}>
          <span className="eyebrow">{t(messages, "recordsPage.newRecordEyebrow")}</span>
          <strong>{t(messages, "recordsPage.newRecordTitle")}</strong>
          <span className="muted">{t(messages, "recordsPage.newRecordBody")}</span>
        </Link>
      </section>

      <section className="dashboard-card">
        <div className="split-heading">
          <div>
            <p className="eyebrow">{t(messages, "recordsPage.filterEyebrow", "Filter records")}</p>
            <h2>{t(messages, "recordsPage.filterTitle", "Find the right records faster")}</h2>
          </div>
          {hasFilters ? <Link className="button-secondary" href={returnTo ? `/records?return_to=${encodeURIComponent(returnTo)}` : "/records"}>{t(messages, "recordsPage.clearFiltersAction", "Clear filters")}</Link> : null}
        </div>
        <form className="records-filter-form" method="get">
          {returnTo ? <input name="return_to" type="hidden" value={returnTo} /> : null}
          <label>
            {t(messages, "recordsPage.filters.search", "Search")}
            <input
              defaultValue={overview.filters?.search ?? ""}
              name="q"
              placeholder={t(messages, "recordsPage.filters.searchPlaceholder", "Search by farm, template, note, or author")}
              type="search"
            />
          </label>
          <label>
            {t(messages, "recordsPage.filters.farm", "Farm")}
            <select defaultValue={overview.filters?.farmId ?? ""} name="farm">
              <option value="">{t(messages, "recordsPage.filters.allFarms", "All farms")}</option>
              {overview.farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </label>
          <label>
            {t(messages, "recordsPage.filters.status", "Status")}
            <select defaultValue={overview.filters?.status ?? ""} name="status">
              <option value="">{t(messages, "recordsPage.filters.allStatuses", "All statuses")}</option>
              <option value="submitted">{t(messages, "recordsPage.filters.submitted", "Submitted")}</option>
              <option value="draft">{t(messages, "recordsPage.filters.draft", "Draft")}</option>
            </select>
          </label>
          <label>
            {t(messages, "recordsPage.filters.dateRange", "Date range")}
            <select defaultValue={overview.filters?.dateRange ?? "30d"} name="dateRange">
              <option value="7d">{t(messages, "recordsPage.filters.last7Days", "Last 7 days")}</option>
              <option value="30d">{t(messages, "recordsPage.filters.last30Days", "Last 30 days")}</option>
              <option value="90d">{t(messages, "recordsPage.filters.last90Days", "Last 90 days")}</option>
              <option value="all">{t(messages, "recordsPage.filters.allTime", "All time")}</option>
            </select>
          </label>
          <div className="records-filter-actions">
            <button className="button" type="submit">{t(messages, "recordsPage.applyFiltersAction", "Apply filters")}</button>
          </div>
        </form>
      </section>

      <section className="dashboard-grid">
        <div className="card">
        <div className="split-heading">
          <div>
            <p className="eyebrow">{t(messages, "recordsPage.templatesEyebrow")}</p>
            <h2>{t(messages, "recordsPage.templatesTitle")}</h2>
          </div>
          <div className="inline-actions">
            <Link className="button-secondary" href="/records/templates">{t(messages, "recordsPage.viewTemplatesAction", "View templates")}</Link>
            <Link className="button-secondary" href={returnTo ? `/records/new?return_to=${encodeURIComponent(returnTo)}` : "/records/new"}>{t(messages, "recordsPage.newRecordAction")}</Link>
          </div>
        </div>
          <div className="records-template-grid">
            {overview.templates.map((template) => (
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
              <p className="eyebrow">{t(messages, "recordsPage.draftsEyebrow", "Draft workspace")}</p>
              <h2>{t(messages, "recordsPage.draftsTitle", "Resume incomplete records")}</h2>
            </div>
            <span className="pill">{draftRecords.length} {t(messages, "recordsPage.metrics.drafts")}</span>
          </div>
          {draftRecords.length ? (
            <div className="records-template-grid">
              {draftRecords.map((record) => (
                <article className="records-template-card" key={record.id}>
                  <span className="pill">{record.farms?.name ?? "Farm"}</span>
                  <h3>{record.record_templates?.name ?? "Operational Record"}</h3>
                  <p className="muted">
                    {formatDate(record.recorded_for_date ?? record.created_at)} · {record.user_profiles?.display_name ?? "Unknown"}
                  </p>
                  <p className="muted">{record.notes_summary ?? t(messages, "recordsPage.draftFallback", "No summary note yet.")}</p>
                  <div className="action-row">
                    <Link className="button" href={returnTo ? `/records/${record.id}/edit?return_to=${encodeURIComponent(returnTo)}` : `/records/${record.id}/edit`}>{t(messages, "recordsPage.resumeDraftAction", "Resume draft")}</Link>
                    <Link className="button-secondary" href={returnTo ? `/records/${record.id}?return_to=${encodeURIComponent(returnTo)}` : `/records/${record.id}`}>{t(messages, "recordsPage.reviewDraftAction", "Review")}</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <div>
                <p className="eyebrow">{t(messages, "recordsPage.noDraftsEyebrow", "No drafts")}</p>
                <h2>{t(messages, "recordsPage.noDraftsTitle", "All visible records are already submitted")}</h2>
                <p className="muted">{t(messages, "recordsPage.noDraftsBody", "Save a record as draft when you want to come back and finish it later.")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="split-heading">
            <div>
              <p className="eyebrow">{t(messages, "recordsPage.historyEyebrow")}</p>
              <h2>{t(messages, "recordsPage.historyTitle")}</h2>
            </div>
            <span className="pill">{overview.records.length} {t(messages, "recordsPage.filteredCount", "records")}</span>
          </div>
          {overview.records.length ? (
            <ul className="status-list">
              {overview.records.map((record) => (
                <li className="mobile-list-row" key={record.id}>
                  <Link className="records-history-link" href={returnTo ? `/records/${record.id}?return_to=${encodeURIComponent(returnTo)}` : `/records/${record.id}`}>
                    <span>
                      <strong>{record.record_templates?.name ?? "Operational Record"}</strong>
                      <span className="list-meta">
                        {formatDate(record.recorded_for_date ?? record.created_at)} · {record.user_profiles?.display_name ?? "Unknown"}
                      </span>
                      {record.notes_summary ? <span className="list-meta">{record.notes_summary}</span> : null}
                    </span>
                    <span className="list-meta">{record.farms?.name ?? "Farm"}</span>
                  </Link>
                  <span className="pill">{record.record_status ?? "unknown"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-panel">
              <div>
                <p className="eyebrow">{t(messages, "recordsPage.emptyEyebrow")}</p>
                <h2>{t(messages, "recordsPage.emptyTitle")}</h2>
                <p className="muted">{t(messages, "recordsPage.emptyBody")}</p>
              </div>
              <div className="action-row">
                <Link className="button" href={returnTo ? `/records/new?return_to=${encodeURIComponent(returnTo)}` : "/records/new"}>{t(messages, "recordsPage.emptyAction")}</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
