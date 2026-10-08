import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getApiErrorMessage } from "../../utils/axios";
import { audienceLabels, lagosInput, fromLagosInput, announcementInput as input, announcementButton as button } from "../../utils/announcements";
import AnnouncementCard from "../../components/Announcements/AnnouncementCard";

export default function AnnouncementEditor({ data, disabled, onChanged, onDraftChanged }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(data?.title || ""), [body, setBody] = useState(data?.body || ""), [audiences, setAudiences] = useState(data?.audiences || ["client", "vendor", "planner"]), [important, setImportant] = useState(data?.important || false);
  const [startsAt, setStartsAt] = useState(lagosInput(data?.startsAt)), [endsAt, setEndsAt] = useState(lagosInput(data?.endsAt)), [note, setNote] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const submission = useRef(null);
  async function submit(event) {
    event.preventDefault(); if (busy || disabled) return; setBusy(true); setError("");
    try {
      const payload = { title: title.trim(), body: body.trim(), audiences, important, startsAt: fromLagosInput(startsAt), endsAt: fromLagosInput(endsAt), note: note.trim() };
      if (payload.startsAt === undefined || payload.endsAt === undefined) throw new Error("Provide valid start and expiry times.");
      if (payload.startsAt && payload.endsAt && payload.endsAt <= payload.startsAt) throw new Error("The expiry must be after the start time.");
      let response;
      if (data) response = await api.patch(`/admin/announcements/${data._id}`, { ...payload, expectedVersion: data.version });
      else {
        const fingerprint = JSON.stringify(payload);
        if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, requestId: crypto.randomUUID() };
        response = await api.post("/admin/announcements", { ...payload, requestId: submission.current.requestId });
      }
      if (data) await onChanged(response.data.message);
      else navigate(`/admin/announcements/${response.data.data._id}`);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 grid items-start gap-6 xl:grid-cols-2"><form onSubmit={submit} onChange={() => onDraftChanged?.()} className="space-y-5 rounded-2xl bg-white p-5" aria-busy={busy}><h2 className="text-xl font-semibold">{data ? "Edit draft content" : "New draft"}</h2><label className="block text-sm">Title<input required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></label><label className="block text-sm">Message<textarea required minLength={10} maxLength={5000} rows={7} value={body} onChange={(e) => setBody(e.target.value)} className={input} /></label><fieldset><legend className="text-sm font-semibold">Audience</legend><div className="mt-3 space-y-3">{Object.entries(audienceLabels).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm"><input type="checkbox" checked={audiences.includes(key)} onChange={(e) => setAudiences((v) => e.target.checked ? [...v, key] : v.filter((a) => a !== key))} className="mt-1 accent-brand-navy" />{label}</label>)}</div><p className="mt-3 text-xs text-gray-500">Choose at least one audience. Everyone makes the notice public and visible to all member roles.</p></fieldset><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="accent-brand-navy" />Mark as important</label><label className="block text-sm">Start time (Lagos)<input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} /><span className="mt-2 block text-xs text-gray-500">Leave blank to make it available when published.</span></label><label className="block text-sm">Expiry (Lagos, optional)<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={input} /></label><label className="block text-sm">Private review note<textarea required maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={input} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || disabled || !audiences.length || !note.trim()} className={button}>{busy ? "Saving..." : data ? "Save content" : "Save draft"}</button><p className="text-xs text-gray-500">Saving keeps this content unpublished. Review the preview before using the publishing controls.</p></form><section><h2 className="mb-3 text-lg font-semibold">Notice preview</h2><AnnouncementCard announcement={{ _id: "preview", publicationVersion: 0, title: title || "Announcement title", body: body || "Your message will appear here.", important, publishedAt: null, endsAt: endsAt ? fromLagosInput(endsAt) : null }} /><p className="mt-3 text-xs text-gray-500">Plain text is supported. Private notes and audience settings are excluded from the published notice.</p></section></div>;
}
