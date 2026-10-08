import { useState } from "react";
import api, { getApiErrorMessage } from "../../utils/axios";
import { announcementInput as input, announcementButton as button } from "../../utils/announcements";

export default function AnnouncementActions({ data, disabled, onChanged }) {
  const actions = data.status === "published" ? ["withdraw"] : ["draft", "withdrawn"].includes(data.status) ? ["publish", "archive"] : [];
  const [selected, setSelected] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const action = actions.includes(selected) ? selected : actions[0];
  async function submit(event) {
    event.preventDefault(); if (busy || disabled) return; setBusy(true); setError("");
    try { const r = await api.post(`/admin/announcements/${data._id}/actions`, { action, expectedVersion: data.version, note: note.trim() }); await onChanged(r.data.message); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }
  if (!actions.length) return <p className="mt-5 text-sm text-gray-600">This announcement is archived. Create a new draft to publish another notice.</p>;
  return <form onSubmit={submit} className="mt-6 max-w-2xl space-y-4 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold">Publishing controls</h2><label className="block text-sm">Action<select value={action} onChange={(e) => setSelected(e.target.value)} className={input}>{actions.map((a) => <option key={a} value={a}>{a === "publish" ? data.startsAt && new Date(data.startsAt).getTime() > Date.now() ? "Schedule publication" : "Publish now" : a === "withdraw" ? "Withdraw notice" : "Archive draft"}</option>)}</select></label><p className="text-sm text-gray-600">{action === "publish" ? "Publishes the saved content to its selected audiences. Republished notices require a fresh member acknowledgement." : action === "withdraw" ? "Removes this notice from the live feeds, including scheduled publication. Withdraw it before changing its content or audience." : "Retains the record and its private history. Archived drafts cannot be republished."}</p><label className="block text-sm">Private review note<textarea required maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={input} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || disabled || !note.trim()} className={button}>{busy ? "Saving..." : action === "publish" ? "Publish saved notice" : action === "withdraw" ? "Withdraw saved notice" : "Archive saved draft"}</button></form>;
}
