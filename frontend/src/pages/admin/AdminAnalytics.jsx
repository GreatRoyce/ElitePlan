import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import api, { getApiErrorMessage } from "../../utils/axios";
import { dateLabel, dateRange, lagosToday } from "../../utils/analyticsDates";
import AdminLayout from "./AdminLayout";
import VisitTrend from "./VisitTrend";

const number = (value) => new Intl.NumberFormat().format(value);
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";

export default function AdminAnalytics() {
  const [range, setRange] = useState(() => dateRange(7));
  const [draft, setDraft] = useState(range);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const request = useRef(null);
  const today = lagosToday();
  const earliest = dateRange(90, today).start;

  const loadReport = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/analytics", { params: range, signal: controller.signal });
      if (!controller.signal.aborted) setReport(response.data.data);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure.response?.status === 403) { setForbidden(true); setReport(null); }
      setError(getApiErrorMessage(failure, "Unable to load site analytics. Please try again."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadReport();
    return () => request.current?.abort();
  }, [loadReport]);

  function applyRange(event) {
    event.preventDefault();
    if (!draft.start || !draft.end || draft.start > draft.end || draft.start < earliest || draft.end > today) {
      setFormError("Choose a start and end date within the last 90 days, with the start before the end.");
      return;
    }
    setFormError("");
    setRange({ ...draft });
  }

  return (
    <AdminLayout loading={loading}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-royal">Site activity</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Site analytics</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-charcoal">See how visitors reach ElitePlan and which pages they explore.</p></div>
        <button type="button" onClick={loadReport} disabled={loading || forbidden} className={`inline-flex items-center gap-2 rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`}><RefreshCw size={16} aria-hidden="true" className={loading ? "motion-safe:animate-spin" : ""} />{loading ? "Loading..." : "Refresh"}</button>
      </header>

      <form onSubmit={applyRange} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-brand-navy/10 bg-white p-4 sm:p-5">
        <fieldset disabled={loading || forbidden} className="flex flex-wrap gap-2"><legend className="mb-2 text-xs font-medium text-brand-charcoal">Quick range</legend>{[7, 30, 90].map((days) => <button key={days} type="button" onClick={() => { const selected = dateRange(days); setDraft(selected); setRange(selected); setFormError(""); }} className={`rounded-lg border border-brand-navy/15 px-3 py-2 text-xs hover:bg-brand-ivory disabled:opacity-60 ${focus}`}>Last {days} days</button>)}</fieldset>
        <label className="flex min-w-0 flex-col gap-2 text-xs font-medium">From<input type="date" required min={earliest} max={today} value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} disabled={forbidden} className={`min-w-0 rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm ${focus}`} /></label>
        <label className="flex min-w-0 flex-col gap-2 text-xs font-medium">To<input type="date" required min={earliest} max={today} value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} disabled={forbidden} className={`min-w-0 rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm ${focus}`} /></label>
        <button type="submit" disabled={loading || forbidden} className={`rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${focus}`}>Apply</button>
        {formError && <p role="alert" className="w-full text-xs text-red-700">{formError}</p>}
      </form>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{report && <p className="mt-1">The figures below are from the last successful update.</p>}</div>}
      {loading && !report && <p role="status" className="mt-8 text-sm text-gray-500">Loading visitor activity...</p>}

      {report && <>
        <p className="mt-6 text-xs leading-relaxed text-gray-500">Showing {dateLabel(report.range.start)} to {dateLabel(report.range.end)} · Lagos time · Updated {new Date(report.generatedAt).toLocaleString()}</p>
        <section aria-label="Visitor totals" className="mt-4 grid gap-4 sm:grid-cols-3">
          {[["Page views", report.totals.pageViews, "Recorded page loads and navigation."], ["Unique browsers", report.totals.visitors, "Estimated from anonymous browser identifiers."], ["Visits", report.totals.visits, "A new visit begins after 30 minutes of inactivity."]].map(([label, value, detail]) => <div key={label} className="rounded-2xl border border-brand-navy/10 bg-white p-5"><p className="text-sm text-brand-charcoal">{label}</p><p className="mt-3 text-3xl font-bold">{number(value)}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{detail}</p></div>)}
        </section>
        {report.totals.pageViews === 0 && <p role="status" className="mt-6 rounded-xl border border-brand-navy/10 bg-white p-4 text-sm text-gray-500">No visits were recorded for these dates. Tracking begins when this version of the site is deployed.</p>}
        <VisitTrend daily={report.daily} />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Popular pages</h2><p className="mt-2 text-xs text-gray-500">Ranked by recorded page views.</p>{report.pages.length ? <ul className="mt-4 divide-y divide-gray-100">{report.pages.map((page) => <li key={page.path} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-all">{page.path}</span><div className="shrink-0 text-right"><p className="font-semibold">{number(page.pageViews)} views</p><p className="mt-1 text-xs text-gray-500">{number(page.visitors)} browsers</p></div></li>)}</ul> : <p className="mt-5 text-sm text-gray-500">No page activity yet.</p>}</section>
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Traffic sources</h2><p className="mt-2 text-xs text-gray-500">Referrer domains, ranked by visits in this period.</p>{report.referrers.length ? <ul className="mt-4 divide-y divide-gray-100">{report.referrers.map((source) => <li key={source.source} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-all">{source.source || "Direct / unknown"}</span><span className="shrink-0 font-semibold">{number(source.visits)} visits</span></li>)}</ul> : <p className="mt-5 text-sm text-gray-500">No referral activity yet.</p>}</section>
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-gray-500">These are estimates of browser activity. Admin browsing is excluded. Privacy preferences, blocked tracking, and cleared browser storage can affect the figures. Daily unique browser counts may include the same browser on several days.</p>
      </>}
    </AdminLayout>
  );
}
