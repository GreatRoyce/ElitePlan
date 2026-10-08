import { useState } from "react";
import { useAuth } from "../../context/authStore";
import api, { getApiErrorMessage } from "../../utils/axios";
import { supportInput as input, supportButton as button, isClosed } from "../../utils/support";

const labels = { claim: "Claim for review", release: "Release reviewer", reply: "Reply to member", request_info: "Request more information", note: "Add private note", priority: "Set priority", resolve: "Resolve support request", reject: "Reject request", accept: "Accept appeal", reopen: "Reopen request" };
function supportActions(data, userId) {
  if (!data.canReview) return [];
  if (isClosed(data)) return ["reopen"];
  if (!data.assignedTo) return ["claim"];
  if (String(data.assignedTo) !== String(userId)) return ["release"];
  return ["note", ...(data.messages.length < 100 ? ["reply", "request_info"] : []), "priority", ...(data.type === "appeal" ? [...(data.currentAppeal?.remedied ? ["accept"] : []), "reject"] : ["resolve", "reject"]), "release"];
}
export default function SupportActions({ data, disabled, onChanged }) {
  const { user } = useAuth(), actions = supportActions(data, user?.id);
  const [selected, setSelected] = useState(""), [note, setNote] = useState(""), [message, setMessage] = useState(""), [resolution, setResolution] = useState(""), [priority, setPriority] = useState("normal"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const action = actions.includes(selected) ? selected : actions[0], messaging = ["reply", "request_info"].includes(action), closing = ["resolve", "reject", "accept"].includes(action);
  async function submit(event) {
    event.preventDefault(); if (busy || disabled || !action) return; setBusy(true); setError("");
    try {
      const r = await api.post(`/admin/support/${data._id}`, { action, expectedVersion: data.version, note: note.trim(), ...(messaging ? { message: message.trim() } : {}), ...(closing ? { resolution: resolution.trim() } : {}), ...(action === "priority" ? { priority } : {}), ...(action === "accept" ? { expectedTargetVersion: data.currentAppeal.version } : {}) });
      setNote(""); setMessage(""); setResolution(""); await onChanged(r.data.message);
    } catch (e) { setError(getApiErrorMessage(e)); if (e.response?.status === 409) await onChanged(); }
    finally { setBusy(false); }
  }
  if (!actions.length) return null;
  return <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl bg-white p-5" aria-busy={busy}><h2 className="text-lg font-semibold">Review action</h2><label className="block text-sm">Action<select value={action} onChange={(e) => setSelected(e.target.value)} className={input}>{actions.map((a) => <option key={a} value={a}>{labels[a]}</option>)}</select></label><label className="block text-sm">Private review note<textarea required maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={input} /></label>{messaging && <label className="block text-sm">Message shown to the member<textarea required maxLength={2000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={input} /></label>}{closing && <label className="block text-sm">Resolution shown to the member<textarea required maxLength={2000} rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} className={input} /></label>}{action === "priority" && <label className="block text-sm">Priority<select value={priority} onChange={(e) => setPriority(e.target.value)} className={input}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label>}{action === "release" && <p className="text-xs text-gray-500">This returns the case to the unassigned queue. Include the reason for releasing it.</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={disabled || busy || !note.trim() || messaging && !message.trim() || closing && !resolution.trim()} className={button}>{busy ? "Saving..." : "Apply action"}</button></form>;
}
