import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { announcementStates as states, audienceLabels, announcementInput as input, announcementFocus as focus, announcementButton as button } from "../../utils/announcements";
import { verificationDate as date } from "../../utils/profileVerification";

export function AdminAnnouncementList({ announcements }) {
  return announcements.length ? <ul className="mt-5 space-y-3">{announcements.map((a) => <li key={a._id} className="rounded-xl bg-white p-5"><Link to={`/admin/announcements/${a._id}`} className={`rounded font-semibold underline ${focus}`}>{a.title}</Link><p className="mt-2 text-sm">{states[a.state]}{a.important && " · Important"}</p><p className="mt-2 text-xs text-gray-500">{a.audiences.map((v) => audienceLabels[v]).join(", ")} · Starts: {date(a.startsAt)} (Lagos) · Ends: {a.endsAt ? `${date(a.endsAt)} (Lagos)` : "No expiry"}</p></li>)}</ul> : <p className="mt-5 rounded-xl bg-white p-5 text-sm">No announcements match these filters.</p>;
}
export default function AdminAnnouncements() {
  const [params, setParams] = useSearchParams(), query = params.toString();
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const data = result?.query === query ? result.data : null;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    api.get(`/admin/announcements${query ? `?${query}` : ""}`, { signal: controller.signal }).then((r) => { if (!controller.signal.aborted) setResult({ query, data: r.data.data }); }).catch((e) => { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(e)); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh]);
  const change = (key, value) => setParams((previous) => { const next = new URLSearchParams(previous); next.set(key, value); if (key !== "page") next.delete("page"); return next; });
  return <AdminLayout loading={loading}><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Announcements</h1><p className="mt-3 max-w-2xl text-sm text-gray-600">Write a draft, choose its audience, and publish now or schedule it. Withdrawing a notice removes it from the live feeds.</p></div><Link to="/admin/announcements/new" className={button}>New announcement</Link></div><div className="mt-6 flex flex-wrap gap-4"><label className="min-w-40 flex-1 text-sm">State<select value={params.get("state") || "all"} onChange={(e) => change("state", e.target.value)} className={input}><option value="all">All states</option>{Object.entries(states).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><label className="min-w-40 flex-1 text-sm">Audience<select value={params.get("audience") || "all"} onChange={(e) => change("audience", e.target.value)} className={input}><option value="all">All audiences</option>{Object.entries(audienceLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><button onClick={() => setRefresh((v) => v + 1)} disabled={loading} className={`self-end rounded bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button></div>{loading && <p role="status" className="mt-5 text-sm">Loading announcements...</p>}{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{data && !loading && !error && <><AdminAnnouncementList announcements={data.announcements} /><div className="mt-5 flex items-center gap-4 text-sm"><button disabled={data.pagination.page <= 1} onClick={() => change("page", String(data.pagination.page - 1))} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)} · {data.pagination.total} notices</span><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => change("page", String(data.pagination.page + 1))} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Next</button></div></>}</AdminLayout>;
}
