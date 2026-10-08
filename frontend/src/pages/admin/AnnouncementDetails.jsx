import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import AnnouncementEditor from "./AnnouncementEditor";
import AnnouncementActions from "./AnnouncementActions";
import AnnouncementCard from "../../components/Announcements/AnnouncementCard";
import api, { getApiErrorMessage } from "../../utils/axios";
import { announcementStates as states, audienceLabels, announcementFocus as focus } from "../../utils/announcements";
import { verificationDate as date } from "../../utils/profileVerification";

export default function AnnouncementDetails({ create = false }) {
  const { announcementId } = useParams();
  const [result, setResult] = useState(null), [loading, setLoading] = useState(!create), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const request = useRef(null), data = result && result.id === announcementId ? result.data : null;
  const [dirtyKey, setDirtyKey] = useState(null), contentKey = data ? `${data._id}:${data.version}` : null;
  const load = useCallback(async (message) => {
    if (create) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setLoading(true); setError(""); if (typeof message === "string") setNotice(message);
    try { const r = await api.get(`/admin/announcements/${encodeURIComponent(announcementId)}`, { signal: controller.signal }); if (!controller.signal.aborted) setResult({ id: announcementId, data: r.data.data }); }
    catch (e) { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(e)); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [create, announcementId]);
  useEffect(() => { setNotice(""); load(); return () => request.current?.abort(); }, [load]);
  return <AdminLayout loading={loading}><Link to="/admin/announcements" className={`rounded text-sm underline ${focus}`}>Back to announcements</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><h1 className="break-words text-3xl font-bold">{create ? "Create announcement" : data?.title || "Announcement review"}</h1>{!create && <button onClick={() => load()} disabled={loading} className={`rounded bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button>}</div>{notice && <p role="status" className="mt-5 text-sm">{notice}</p>}{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{loading && !data && <p role="status" className="mt-5 text-sm">Loading announcement...</p>}{create ? <AnnouncementEditor key="new" /> : data && <><p className="mt-4 text-sm">{states[data.state]} · {data.audiences.map((a) => audienceLabels[a]).join(", ")}</p>{["draft", "withdrawn"].includes(data.status) ? <AnnouncementEditor key={`${data._id}:${data.version}`} data={data} disabled={loading || Boolean(error)} onChanged={load} onDraftChanged={() => setDirtyKey(contentKey)} /> : <div className="mt-6"><AnnouncementCard announcement={data} /></div>}{dirtyKey === contentKey && <p className="mt-4 text-sm">Save your draft changes before publishing or archiving.</p>}<AnnouncementActions key={`${data._id}:${data.version}`} data={data} disabled={loading || Boolean(error) || dirtyKey === contentKey} onChanged={load} /><section className="mt-6 rounded-2xl bg-white p-5"><h2 className="text-lg font-semibold">Private publishing history</h2><p className="mt-2 text-xs text-gray-500">Visible only to admins. The most recent 100 actions are retained.</p><ul className="mt-3 divide-y divide-brand-navy/10">{data.history.map((h) => <li key={h._id} className="py-4 text-sm"><p className="font-semibold">{h.action} · {date(h.at)} (Lagos)</p><p className="mt-2 whitespace-pre-wrap break-words">{h.note}</p><p className="mt-2 break-all text-xs text-gray-500">Actor: {h.by}</p></li>)}</ul></section></>}</AdminLayout>;
}
