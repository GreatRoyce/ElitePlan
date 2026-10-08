import { useState } from "react";
import api, { getApiErrorMessage } from "../../utils/axios";
import { announcementButton as button, announcementFocus as focus } from "../../utils/announcements";
import { verificationDate as date } from "../../utils/profileVerification";

export default function AnnouncementCard({ announcement: a, member = false, compact = false, disabled = false, onAcknowledged, onDismiss }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function acknowledge() {
    if (busy || disabled) return; setBusy(true); setError("");
    try { await api.post(`/announcements/${a._id}/acknowledge`, { publicationVersion: a.publicationVersion }); await onAcknowledged?.(a); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }
  return <article className={`min-w-0 rounded-xl border p-5 ${a.important ? "border-brand-gold/60 bg-amber-50" : "border-brand-navy/10 bg-white"}`}><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="break-words text-lg font-semibold">{a.title}</h2>{a.important && <span className="rounded bg-brand-gold/20 px-2 py-1 text-xs font-semibold">Important notice</span>}</div><p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed ${compact ? "line-clamp-3" : ""}`}>{a.body}</p>{!compact && <p className="mt-4 text-xs text-gray-500">Published: {date(a.publishedAt)} (Lagos){a.endsAt && ` · Available until: ${date(a.endsAt)} (Lagos)`}</p>}<div className="mt-4 flex flex-wrap items-center gap-3">{member ? a.acknowledgedAt ? <p className="text-xs text-gray-500">Acknowledged · {date(a.acknowledgedAt)} (Lagos)</p> : <button onClick={acknowledge} disabled={busy || disabled} className={button}>{busy ? "Saving..." : "Acknowledge notice"}</button> : onDismiss && <button onClick={() => onDismiss(a)} className={`rounded text-xs underline ${focus}`}>Dismiss for this visit</button>}</div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</article>;
}
