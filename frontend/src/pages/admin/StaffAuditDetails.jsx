import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { auditCategories as categories, auditOutcomes as outcomes, auditTargets as targets, auditFocus as focus, auditActionLabel as actionLabel } from "../../utils/staffAudit";
import { verificationDate as date } from "../../utils/profileVerification";
import SettingsAuditChange from "../../components/Platform/SettingsAuditChange";

export function AuditSummary({ entry: e }) {
  return <section className="mt-6 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold">{categories[e.category]} · <span className="capitalize">{actionLabel(e.action)}</span></h2><dl className="mt-5 space-y-4 text-sm">{[["Staff member", `${e.actorName} (${e.actorRole} at the time)`], ["Staff account ID", e.actorId], ["Target type", targets[e.targetKind]], ["Target record ID", e.targetId || "Not recorded"], ["Attempted (Lagos)", date(e.attemptedAt)], ["Completed (Lagos)", date(e.completedAt)], ["Outcome", e.completionUnconfirmed ? "Outcome unconfirmed" : outcomes[e.outcome]], ["HTTP status", e.httpStatus], ["Expected revision", e.expectedVersion], ["Result revision", e.resultVersion], ["Result state", e.resultState], ["Result role", e.resultRole], ["Result permissions", Array.isArray(e.resultPermissions) ? e.resultPermissions.join(", ") || "No moderator permissions" : null], ["Result reviewer ID", e.resultAssignedTo], ["Result priority", e.resultPriority], ["Request reference", e.requestId], ["Endpoint", `${e.method} /api/v1/admin${e.route}`]].map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[170px_minmax(0,1fr)]"><dt className="text-gray-500">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{value ?? "Not recorded"}</dd></div>)}</dl><SettingsAuditChange change={e.settingsChange} /><h3 className="mt-6 text-sm font-semibold">Private review note</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{e.note || "No valid review note was supplied."}</p>{["pending", "unconfirmed", "failed"].includes(e.outcome) && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Check the related record before repeating the action. This entry does not confirm whether a change was applied.</p>}<div className="mt-5 flex flex-wrap gap-4 text-sm"><Link to={`/admin/audit?actorId=${e.actorId}`} className={`rounded underline ${focus}`}>View this staff member's actions</Link>{e.targetLink && <Link to={e.targetLink} className={`rounded underline ${focus}`}>Open related record</Link>}</div><p className="mt-5 text-xs text-gray-500">The staff name and role reflect the time of the request. Related records show their current state.</p></section>;
}
export default function StaffAuditDetails() {
  const { auditId } = useParams();
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const request = useRef(null), entry = result && result.id === auditId ? result.data : null;
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setLoading(true); setError("");
    try { const r = await api.get(`/admin/audit/${encodeURIComponent(auditId)}`, { signal: controller.signal }); if (!controller.signal.aborted) setResult({ id: auditId, data: r.data.data }); }
    catch (e) { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(e)); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [auditId]);
  useEffect(() => { load(); return () => request.current?.abort(); }, [load]);
  return <AdminLayout loading={loading}><Link to="/admin/audit" className={`rounded text-sm underline ${focus}`}>Back to audit history</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><h1 className="text-3xl font-bold">Staff audit entry</h1><button onClick={load} disabled={loading} className={`rounded bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button></div>{loading && !entry && <p role="status" className="mt-5 text-sm">Loading audit entry...</p>}{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{entry && <AuditSummary entry={entry} />}</AdminLayout>;
}
