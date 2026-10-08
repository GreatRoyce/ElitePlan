import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../utils/axios";
import supportApi, { supportLabels as labels, supportStatuses, supportInput as input, supportFocus as focus } from "../../utils/support";

export function SupportList({ data, staff = false }) {
  return <><ul className="mt-5 divide-y divide-brand-navy/10 rounded-2xl bg-white px-5">{data.tickets.map((ticket) => <li key={ticket._id} className="py-5"><Link to={`${staff ? "/admin/support" : "/support"}/${ticket._id}`} className={`rounded font-semibold underline ${focus}`}>{ticket.subject}</Link><p className="mt-2 text-sm text-gray-600">{labels[ticket.type]} · {labels[ticket.status]}{staff && ` · ${ticket.priority} priority · ${ticket.assignedTo ? "Assigned" : "Unassigned"}`}</p>{ticket.appeal && <p className="mt-1 text-xs text-gray-500">{labels[ticket.appeal.kind]}</p>}</li>)}</ul>{!data.tickets.length && <p className="mt-5 rounded-xl bg-white p-5 text-sm">No support requests match these filters.</p>}</>;
}
export default function SupportQueue({ staff = false, onExpired }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const status = supportStatuses.includes(params.get("status")) ? params.get("status") : "all";
  const type = ["support", "appeal"].includes(params.get("type")) ? params.get("type") : "all";
  const priority = ["normal", "urgent"].includes(params.get("priority")) ? params.get("priority") : "all";
  const assigned = ["mine", "unassigned"].includes(params.get("assigned")) ? params.get("assigned") : "all";
  const page = Math.min(100000, Math.max(1, Number(params.get("page")) || 1));
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setData(null);
    (staff ? api : supportApi).get(staff ? "/admin/support" : "/support/tickets", { params: { status, page, ...(staff ? { type, priority, assigned } : {}) }, signal: controller.signal })
      .then((r) => { if (!controller.signal.aborted) setData(r.data.data); })
      .catch((e) => { if (!controller.signal.aborted) { setError(getApiErrorMessage(e, "Unable to load requests.")); if (e.response?.status === 401) onExpired?.(); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [staff, status, type, priority, assigned, page, refresh, onExpired]);
  const change = (key, value) => setParams((previous) => { const next = new URLSearchParams(previous); next.set(key, value); if (key !== "page") next.delete("page"); return next; });
  return <section aria-busy={loading}><div className="mt-6 flex flex-wrap gap-4">{[["status", "Status", status, ["all", ...supportStatuses]], ...(staff ? [["type", "Type", type, ["all", "support", "appeal"]], ["priority", "Priority", priority, ["all", "normal", "urgent"]], ["assigned", "Reviewer", assigned, ["all", "mine", "unassigned"]]] : [])].map(([key, label, value, options]) => <label key={key} className="min-w-40 flex-1 text-sm">{label}<select value={value} onChange={(e) => change(key, e.target.value)} className={input}>{options.map((v) => <option key={v} value={v}>{labels[v] || v}</option>)}</select></label>)}<button onClick={() => setRefresh((v) => v + 1)} disabled={loading} className={`self-end rounded-lg bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button></div>{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{loading && <p role="status" className="mt-5 text-sm">Loading requests...</p>}{data && <><SupportList data={data} staff={staff} /><div className="mt-5 flex items-center gap-4 text-sm"><button disabled={data.pagination.page <= 1 || loading} onClick={() => change("page", String(data.pagination.page - 1))} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)} · {data.pagination.total} requests</span><button disabled={data.pagination.page >= data.pagination.totalPages || loading} onClick={() => change("page", String(data.pagination.page + 1))} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Next</button></div></>}</section>;
}
