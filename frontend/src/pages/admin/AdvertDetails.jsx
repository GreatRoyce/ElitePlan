import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import AdvertCard from "../../components/Adverts/AdvertCard";
import api, { getApiErrorMessage } from "../../utils/axios";
import { advertPlacements, advertUrl } from "../../utils/adverts";
import { audienceLabels, announcementStates as states, lagosInput, fromLagosInput, announcementInput as input, announcementButton as button, announcementFocus as focus } from "../../utils/announcements";
import { verificationDate as date } from "../../utils/profileVerification";

export function AdvertEditor({ data, disabled, onChanged, onDraftChanged }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => ({ sponsor: data?.sponsor || "", title: data?.title || "", body: data?.body || "", destinationUrl: data?.destinationUrl || "", ctaLabel: data?.ctaLabel || "Learn more", imageUrl: data?.imageUrl || "", imageAlt: data?.imageAlt || "", placements: data?.placements || ["home", "dashboard"], audiences: data?.audiences || ["public"], startsAt: lagosInput(data?.startsAt), endsAt: lagosInput(data?.endsAt) }));
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submission = useRef(null), change = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
  async function submit(event) {
    event.preventDefault(); if (busy || disabled) return; setBusy(true); setError("");
    try {
      const payload = { ...draft, startsAt: fromLagosInput(draft.startsAt), endsAt: fromLagosInput(draft.endsAt), note: note.trim() };
      if (!advertUrl(draft.destinationUrl) || draft.imageUrl && !advertUrl(draft.imageUrl, true)) throw new Error("Use an HTTPS destination or a site path. Image URLs must use HTTPS or an existing /uploads/ image path.");
      if (payload.startsAt === undefined || payload.endsAt === undefined || payload.startsAt && payload.endsAt && payload.endsAt <= payload.startsAt) throw new Error("Provide valid dates, with expiry after the start time.");
      let r;
      if (data) r = await api.patch(`/admin/adverts/${data._id}`, { ...payload, expectedVersion: data.version });
      else { const fingerprint = JSON.stringify(payload); if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, requestId: crypto.randomUUID() }; r = await api.post("/admin/adverts", { ...payload, requestId: submission.current.requestId }); }
      if (data) await onChanged(r.data.message); else navigate(`/admin/adverts/${r.data.data._id}`, { state: { notice: r.data.message } });
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 grid items-start gap-6 xl:grid-cols-2"><form onSubmit={submit} onChange={() => onDraftChanged?.()} className="rounded-2xl bg-white p-5" aria-busy={busy}><h2 className="text-xl font-semibold">{data ? "Edit advert draft" : "New advert draft"}</h2><fieldset disabled={busy || disabled} className="mt-5 space-y-5">
    {[["sponsor", "Advertiser name", 2, 100], ["title", "Headline", 3, 120], ["destinationUrl", "Destination URL or site path", 1, 2048], ["ctaLabel", "Button label", 2, 40], ["imageUrl", "Image URL (optional)", 0, 2048], ["imageAlt", "Image description", draft.imageUrl ? 1 : 0, 160]].map(([key, label, min, max]) => <label key={key} className="block text-sm">{label}<input required={min > 0} minLength={min || undefined} maxLength={max} value={draft[key]} onChange={(e) => change(key, e.target.value)} className={input} /></label>)}
    <label className="block text-sm">Advert text (optional)<textarea maxLength={700} rows={4} value={draft.body} onChange={(e) => change("body", e.target.value)} className={input} /></label>
    {[["placements", "Advert spaces", advertPlacements], ["audiences", "Audience", audienceLabels]].map(([key, label, choices]) => <fieldset key={key}><legend className="text-sm font-semibold">{label}</legend><div className="mt-3 space-y-3">{Object.entries(choices).map(([value, text]) => <label key={value} className="flex items-start gap-3 text-sm"><input type="checkbox" checked={draft[key].includes(value)} onChange={(e) => change(key, e.target.checked ? [...draft[key], value] : draft[key].filter((v) => v !== value))} className={`mt-1 accent-brand-navy ${focus}`} />{text}</label>)}</div></fieldset>)}
    <p className="text-xs text-gray-500">Everyone includes visitors and all member roles. Choose at least one space and audience. Dashboard adverts appear in overview sections.</p>
    <label className="block text-sm">Start time (Lagos, optional)<input type="datetime-local" value={draft.startsAt} onChange={(e) => change("startsAt", e.target.value)} className={input} /></label><label className="block text-sm">Expiry (Lagos, optional)<input type="datetime-local" value={draft.endsAt} onChange={(e) => change("endsAt", e.target.value)} className={input} /></label>
    <label className="block text-sm">Private review note<textarea required maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={input} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={!draft.placements.length || !draft.audiences.length || !note.trim()} className={button}>{busy ? "Saving..." : "Save advert draft"}</button></fieldset><p className="mt-4 text-xs text-gray-500">Saving leaves the advert unpublished. Review it before publishing. Live adverts rotate every 15 seconds.</p></form><section><h2 className="mb-3 text-lg font-semibold">Advert preview</h2><AdvertCard advert={{ ...draft, sponsor: draft.sponsor || "Advertiser", title: draft.title || "Your advert headline" }} /></section></div>;
}

export function AdvertActions({ data, disabled, onChanged }) {
  const actions = data.status === "published" ? ["withdraw"] : ["draft", "withdrawn"].includes(data.status) ? ["publish", "archive"] : [];
  const [selected, setSelected] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const action = actions.includes(selected) ? selected : actions[0];
  async function submit(event) {
    event.preventDefault(); if (busy || disabled) return; setBusy(true); setError("");
    try { const r = await api.post(`/admin/adverts/${data._id}/actions`, { action, expectedVersion: data.version, note: note.trim() }); await onChanged(r.data.message); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }
  if (!actions.length) return <p className="mt-5 text-sm text-gray-600">This advert is archived. Create another draft to publish a new campaign.</p>;
  return <form onSubmit={submit} className="mt-6 max-w-2xl space-y-4 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold">Publishing controls</h2><fieldset disabled={busy || disabled} className="space-y-4"><label className="block text-sm">Action<select value={action} onChange={(e) => setSelected(e.target.value)} className={input}>{actions.map((a) => <option key={a} value={a}>{a === "publish" ? data.startsAt && new Date(data.startsAt).getTime() > Date.now() ? "Schedule advert" : "Publish advert" : a === "withdraw" ? "Withdraw advert" : "Archive draft"}</option>)}</select></label><p className="text-sm text-gray-600">{action === "publish" ? "Publishes the saved advert to its selected spaces and audiences. A future start time schedules it." : action === "withdraw" ? "Stops this advert appearing in live feeds. Withdraw it before changing its content, dates or audience." : "Retains this draft and its private review history."}</p><label className="block text-sm">Private review note<textarea required maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={input} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={!note.trim()} className={button}>{busy ? "Saving..." : action === "publish" ? "Publish saved advert" : action === "withdraw" ? "Withdraw saved advert" : "Archive saved draft"}</button></fieldset></form>;
}

export default function AdvertDetails({ create = false }) {
  const { advertId } = useParams(), location = useLocation();
  const [result, setResult] = useState(null), [loading, setLoading] = useState(!create), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const request = useRef(null), data = result && result.id === advertId ? result.data : null;
  const [dirtyKey, setDirtyKey] = useState(null), contentKey = data ? `${data._id}:${data.version}` : null;
  const load = useCallback(async (message) => {
    if (create) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setLoading(true); setError(""); if (typeof message === "string") setNotice(message);
    try { const r = await api.get(`/admin/adverts/${encodeURIComponent(advertId)}`, { signal: controller.signal }); if (!controller.signal.aborted) setResult({ id: advertId, data: r.data.data }); }
    catch (e) { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(e)); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [create, advertId]);
  useEffect(() => { setNotice(typeof location.state?.notice === "string" ? location.state.notice : ""); load(); return () => request.current?.abort(); }, [load, location.state]);
  return <AdminLayout loading={loading}><Link to="/admin/adverts" className={`rounded text-sm underline ${focus}`}>Back to adverts</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><h1 className="break-words text-3xl font-bold">{create ? "Create advert" : data?.title || "Advert review"}</h1>{!create && <button onClick={() => load()} disabled={loading} className={`rounded bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button>}</div>{notice && <p role="status" className="mt-5 text-sm">{notice}</p>}{error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{loading && !data && <p role="status" className="mt-5 text-sm">Loading advert...</p>}{create ? <AdvertEditor key="new" /> : data && <><p className="mt-4 text-sm">{states[data.state]} · Revision {data.version} · {data.placements.map((p) => advertPlacements[p]).join(", ")}</p>{["draft", "withdrawn"].includes(data.status) ? <AdvertEditor key={`${data._id}:${data.version}`} data={data} disabled={loading || Boolean(error)} onChanged={load} onDraftChanged={() => setDirtyKey(contentKey)} /> : <div className="mt-6"><AdvertCard advert={data} /></div>}{dirtyKey === contentKey && <p className="mt-4 text-sm">Save draft changes before publishing or archiving.</p>}<AdvertActions key={`${data._id}:${data.version}`} data={data} disabled={loading || Boolean(error) || dirtyKey === contentKey} onChanged={load} /><section className="mt-6 rounded-2xl bg-white p-5"><h2 className="text-lg font-semibold">Private advert history</h2><p className="mt-2 text-xs text-gray-500">The most recent 100 actions are retained here.</p><ul className="mt-3 divide-y divide-brand-navy/10">{data.history.map((h) => <li key={h._id} className="py-4 text-sm"><p className="font-semibold">{h.action} · {date(h.at)} (Lagos)</p><p className="mt-2 whitespace-pre-wrap break-words">{h.note}</p><p className="mt-2 break-all text-xs text-gray-500">Actor: {h.by}</p></li>)}</ul><Link to={`/admin/audit?category=adverts&targetId=${data._id}`} className={`mt-4 inline-block rounded text-sm underline ${focus}`}>Full advert audit history</Link></section></>}</AdminLayout>;
}
