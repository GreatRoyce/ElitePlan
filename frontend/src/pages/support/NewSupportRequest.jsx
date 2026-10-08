import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import supportApi, { supportLabels as labels, supportInput as input, supportButton as button } from "../../utils/support";
import { getApiErrorMessage } from "../../utils/axios";

export default function NewSupportRequest({ options, onExpired }) {
  const navigate = useNavigate(), [params] = useSearchParams();
  const suggested = options.find((a) => a.kind === params.get("appeal"));
  const [type, setType] = useState(suggested ? "appeal" : "support"), [kind, setKind] = useState(suggested?.kind || options[0]?.kind || "");
  const [category, setCategory] = useState(suggested?.kind === "account" ? "account_access" : suggested ? "profile" : "other");
  const [subject, setSubject] = useState(""), [details, setDetails] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const submission = useRef(null), appeal = options.find((a) => a.kind === kind);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    const payload = { type, category, subject: subject.trim(), details: details.trim(), ...(type === "appeal" ? { appealKind: kind } : {}) }, fingerprint = JSON.stringify(payload);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, requestId: crypto.randomUUID() };
    try { const r = await supportApi.post("/support/tickets", { ...payload, requestId: submission.current.requestId }); navigate(`/support/${r.data.data._id}`); }
    catch (e) { setError(getApiErrorMessage(e)); if (e.response?.status === 401) onExpired?.(); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl bg-white p-5" aria-busy={busy}><h2 className="text-xl font-semibold">New request</h2><label className="block text-sm">Request type<select value={type} onChange={(e) => setType(e.target.value)} className={input}><option value="support">Support request</option><option value="appeal" disabled={!options.length}>Appeal a restriction</option></select></label>{!options.length && <p className="text-xs text-gray-500">No current restrictions are available to appeal. You can still send a support request.</p>}{type === "appeal" && <><label className="block text-sm">Restriction to appeal<select value={kind} onChange={(e) => setKind(e.target.value)} className={input}>{options.map((a) => <option key={a.kind} value={a.kind}>{labels[a.kind]}</option>)}</select></label>{appeal && <div className="rounded-xl bg-brand-ivory p-4 text-sm"><p>{labels[appeal.kind]} · {appeal.status}</p><p className="mt-2 whitespace-pre-wrap break-words">{appeal.reason || "No reason recorded."}</p><p className="mt-2 text-xs text-gray-500">This request records the current decision for an admin to review.</p></div>}</>}<label className="block text-sm">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>{["account_access", "profile", "technical", "billing", "other"].map((c) => <option key={c} value={c}>{labels[c]}</option>)}</select></label><label className="block text-sm">Subject<input required minLength={3} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} className={input} /></label><label className="block text-sm">Details<textarea required minLength={10} maxLength={5000} rows={6} value={details} onChange={(e) => setDetails(e.target.value)} className={input} /></label><p className="text-xs text-gray-500">Explain what happened and the outcome you need. Keep passwords and payment card details out of your message. Replies appear in this portal.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || type === "appeal" && !appeal} className={button}>{busy ? "Sending..." : "Send request"}</button></form>;
}
