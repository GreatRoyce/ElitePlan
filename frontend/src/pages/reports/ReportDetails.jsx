import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import api, { getApiErrorMessage } from "../../utils/axios";
import { hasStaffPermission } from "../../utils/staffAccess";
import { reportStatuses, reportCategories, reportTypes, reportDate, reportFocus } from "../../utils/reportLabels";
import ReportLayout from "./ReportLayout";
import ReportEvidence from "./ReportEvidence";
import ReportActions from "./ReportActions";

export default function ReportDetails({ staff = false }) {
  const { reportId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.message || "");
  const prefix = staff ? user.role === "admin" ? "/admin" : "/moderator" : "";
  const load = useCallback(async (signal) => {
    try { const response = await api.get(`${staff ? "/admin" : ""}/reports/${reportId}`, { signal }); if (!signal?.aborted) { setReport(response.data.data); setLoading(false); } }
    catch (failure) { if (!signal?.aborted) { setError(getApiErrorMessage(failure, "Unable to load this report.")); setReport(null); setLoading(false); } }
  }, [staff, reportId]);
  useEffect(() => { setLoading(true); setReport(null); setError(""); const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  async function refresh(message = "") { setNotice(message); setError(""); setLoading(true); setReport(null); await load(); }
  return <ReportLayout staff={staff} loading={loading}><Link to={`${prefix}/reports`} className={`rounded text-sm hover:underline ${reportFocus}`}>Back to {staff ? "reports queue" : "My reports"}</Link>{notice && <p role="status" className="mt-4 rounded-xl bg-white p-4 text-sm">{notice}</p>}{loading && <p role="status" className="mt-6 text-sm">Loading report…</p>}{error && <p role="alert" className="mt-6 text-sm text-red-700">{error}<button onClick={() => refresh()} className={`ml-3 rounded underline ${reportFocus}`}>Try again</button></p>}{!loading && report && <><article className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><h1 className="break-words text-2xl font-bold">{report.subject}</h1><span className="rounded-full bg-brand-ivory px-3 py-1 text-sm">{reportStatuses[report.status]}</span></div><p className="mt-3 text-sm text-brand-charcoal">{reportTypes[report.type]} · {report.targetLabel} · {reportCategories[report.category]}</p><p className="mt-2 text-xs text-gray-500">Submitted {reportDate(report.createdAt)} · Updated {reportDate(report.updatedAt)} (Lagos time)</p><p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed">{report.details}</p><ReportEvidence evidence={report.evidence} />{report.resolution && <section className="mt-5 border-t border-gray-100 pt-5"><h2 className="text-base font-semibold">Resolution for the reporter</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{report.resolution}</p><p className="mt-2 text-xs text-gray-500">{reportDate(report.resolvedAt)} (Lagos time)</p></section>}{staff && <section className="mt-5 border-t border-gray-100 pt-5"><h2 className="text-sm font-semibold">Staff review</h2><p className="mt-2 text-sm">{report.priority === "urgent" ? "Urgent" : "Normal urgency"} · {!report.assignedTo ? "Unassigned" : report.assignedTo === user.id ? "Assigned to you" : "Assigned to another reviewer"}{report.adminOnly ? " · Admin review required" : ""}</p>{hasStaffPermission(user, "users.read") && <div className="mt-3 flex flex-wrap gap-4 text-sm"><Link to={`${prefix}/users/${report.reporter}`} className={`rounded underline ${reportFocus}`}>View reporter account</Link>{report.targetUser && <Link to={`${prefix}/users/${report.targetUser}`} className={`rounded underline ${reportFocus}`}>View reported account</Link>}</div>}<p className="mt-3 text-xs text-gray-500">Account actions are available in user details after reviewing the evidence.</p></section>}</article>{staff && <><ReportActions key={`${report._id}:${report.version}`} report={report} user={user} onChanged={refresh} /><section className="mt-6 rounded-2xl bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Private case history</h2>{report.history.length ? <ul className="mt-4 divide-y divide-gray-100">{report.history.map((entry) => <li key={entry._id} className="py-4"><p className="text-sm font-semibold capitalize">{entry.action} · {reportStatuses[entry.status]}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.note}</p>{entry.resolution && <p className="mt-2 whitespace-pre-wrap break-words text-sm">Reporter resolution: {entry.resolution}</p>}<p className="mt-2 break-all text-xs text-gray-500">{reportDate(entry.at)} (Lagos time) · Reviewer ID: {entry.by}</p></li>)}</ul> : <p className="mt-3 text-sm text-gray-500">No staff changes recorded.</p>}</section></>}</>}</ReportLayout>;
}
