import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import api, { getApiErrorMessage } from "../../utils/axios";
import { reportStatuses, reportCategories, reportTypes, reportDate, reportFocus, reportInput } from "../../utils/reportLabels";
import ReportLayout from "./ReportLayout";

export default function ReportsPage({ staff = false }) {
  const { user } = useAuth();
  const prefix = staff ? user.role === "admin" ? "/admin/reports" : "/moderator/reports" : "/reports";
  const [filters, setFilters] = useState({ status: "all", ...(staff ? { category: "all", type: "all", priority: "all", assigned: "all", sort: "newest" } : {}) });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api.get(staff ? "/admin/reports" : "/reports", { params: { ...filters, page }, signal: controller.signal }).then((response) => { if (active) { setData(response.data.data); setLoading(false); } }).catch((failure) => { if (active) { setError(getApiErrorMessage(failure, "Unable to load reports.")); setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [staff, filters, page, retry]);
  function change(key, value) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); setLoading(true); setError(""); setData(null); }
  function refresh() { setLoading(true); setError(""); setData(null); setRetry((current) => current + 1); }
  const options = { status: reportStatuses, ...(staff ? { category: reportCategories, type: reportTypes, priority: { normal: "Normal", urgent: "Urgent" }, assigned: { mine: "Assigned to me", unassigned: "Unassigned" }, sort: { newest: "Newest first", oldest: "Oldest first", priority: "Urgent first" } } : {}) };
  return <ReportLayout staff={staff} loading={loading}><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold sm:text-3xl">{staff ? "Reports & complaints" : "My reports"}</h1><p className="mt-2 text-sm text-brand-charcoal">{staff ? "Review concerns, record decisions, and send resolutions to reporters." : "Submit concerns and follow their progress here."}</p>{staff && user.role === "moderator" && <p className="mt-2 text-xs text-gray-500">Cases involving staff are handled by admins.</p>}</div>{!staff && <Link to="/reports/new" className={`rounded-lg bg-brand-navy px-4 py-2.5 text-sm text-white ${reportFocus}`}>Submit a complaint</Link>}</div>
    <div className="mt-6 grid gap-3 rounded-2xl bg-white p-5 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(options).map(([key, values]) => <label key={key} className="text-xs font-medium"><span className="capitalize">{key === "assigned" ? "Reviewer" : key}</span><select value={filters[key]} onChange={(event) => change(key, event.target.value)} className={`mt-2 ${reportInput}`}>{key !== "sort" && <option value="all">All</option>}{Object.entries(values).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>
    <div className="mt-6" aria-live="polite">{loading && <p className="text-sm">Loading reports…</p>}{error && <div role="alert" className="rounded-xl bg-white p-5 text-sm text-red-700">{error}<button onClick={refresh} className={`ml-3 rounded underline ${reportFocus}`}>Try again</button></div>}{!loading && !error && data && <><p className="mb-3 text-sm text-gray-500">{data.pagination.total} {data.pagination.total === 1 ? "case" : "cases"}</p>{data.reports.length ? <ul className="space-y-3">{data.reports.map((report) => <li key={report._id} className="rounded-2xl border border-brand-navy/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Link to={`${prefix}/${report._id}`} className={`break-words rounded font-semibold hover:underline ${reportFocus}`}>{report.subject}</Link><span className="rounded-full bg-brand-ivory px-3 py-1 text-xs">{reportStatuses[report.status]}</span></div><p className="mt-2 text-sm text-brand-charcoal">{reportTypes[report.type]} · {report.targetLabel} · {reportCategories[report.category]}</p>{staff && <p className="mt-2 text-xs text-gray-500">{report.priority === "urgent" ? "Urgent · " : ""}{!report.assignedTo ? "Unassigned" : report.assignedTo === user.id ? "Assigned to you" : "Assigned to another reviewer"}{report.adminOnly ? " · Admin review" : ""}</p>}<p className="mt-3 text-xs text-gray-500">Submitted {reportDate(report.createdAt)} (Lagos time)</p></li>)}</ul> : <p className="rounded-xl bg-white p-5 text-sm">No reports match these filters.</p>}<div className="mt-5 flex items-center justify-between gap-3 text-sm"><button disabled={data.pagination.page <= 1} onClick={() => { setPage(data.pagination.page - 1); setLoading(true); setData(null); }} className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${reportFocus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}</span><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => { setPage(data.pagination.page + 1); setLoading(true); setData(null); }} className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${reportFocus}`}>Next</button></div></>}</div>
  </ReportLayout>;
}
