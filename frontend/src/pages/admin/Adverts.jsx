import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { announcementStates as states, audienceLabels, announcementInput as input, announcementFocus as focus, announcementButton as button } from "../../utils/announcements";
import { advertPlacements } from "../../utils/adverts";
import { verificationDate as date } from "../../utils/profileVerification";

export function AdvertList({ adverts }) {
  return adverts.length ? <ul className="mt-5 space-y-3">{adverts.map((a) => <li key={a._id} className="rounded-xl bg-white p-5"><Link to={`/admin/adverts/${a._id}`} className={`rounded font-semibold underline ${focus}`}>{a.title}</Link><p className="mt-2 text-sm">{a.sponsor} · {states[a.state]}</p><p className="mt-2 text-xs text-gray-500">{a.placements.map((p) => advertPlacements[p]).join(", ")} · {a.audiences.map((v) => audienceLabels[v]).join(", ")}</p><p className="mt-2 text-xs text-gray-500">Starts: {date(a.startsAt)} (Lagos) · Ends: {a.endsAt ? `${date(a.endsAt)} (Lagos)` : "No expiry"}</p></li>)}</ul> : <p className="mt-5 rounded-xl bg-white p-5 text-sm">No adverts match these filters. Create a draft to fill an advert space.</p>;
}
export default function Adverts() {
  const [params, setParams] = useSearchParams(), query = params.toString();
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const data = result?.query === query ? result.data : null;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    api.get(`/admin/adverts${query ? `?${query}` : ""}`, { signal: controller.signal }).then((r) => { if (!controller.signal.aborted) setResult({ query, data: r.data.data }); }).catch((e) => { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(e)); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh]);
  const change = (key, value) => setParams((previous) => { const next = new URLSearchParams(previous); next.set(key, value); if (key !== "page") next.delete("page"); return next; });
  return <AdminLayout loading={loading}><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Adverts</h1><p className="mt-3 max-w-2xl text-sm text-gray-600">Manage sponsored banners on the home page and member dashboard overviews. Multiple live adverts rotate every 15 seconds.</p></div><Link to="/admin/adverts/new" className={button}>New advert</Link></div><div className="mt-6 flex flex-wrap gap-4">{[["state", "State", states], ["placement", "Placement", advertPlacements], ["audience", "Audience", audienceLabels]].map(([key, label, choices]) => <label key={key} className="min-w-40 flex-1 text-sm">{label}<select value={params.get(key) || "all"} onChange={(e) => change(key, e.target.value)} className={input}><option value="all">All</option>{Object.entries(choices).map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label>)}<button onClick={() => setRefresh((v) => v + 1)} disabled={loading} className={`self-end rounded bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button></div>{loading && <p role="status" className="mt-5 text-sm">Loading adverts...</p>}{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{data && !loading && !error && <><AdvertList adverts={data.adverts} /><div className="mt-5 flex items-center gap-4 text-sm"><button disabled={data.pagination.page <= 1} onClick={() => change("page", String(data.pagination.page - 1))} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)} · {data.pagination.total} adverts</span><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => change("page", String(data.pagination.page + 1))} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Next</button></div></>}</AdminLayout>;
}
