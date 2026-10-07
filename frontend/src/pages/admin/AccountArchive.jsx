import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../utils/axios";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
const date = (value) => new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos" });

export default function AccountArchive({ account, archive, version, disabled, onChanged }) {
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!["client", "vendor", "planner"].includes(account.role)) return null;
  const archived = Boolean(archive.archivedAt);
  async function submit() {
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/admin/users/${account._id}/archive`, { action: archived ? "unarchive" : "archive", reason: reason.trim(), expectedVersion: version });
      setReview(false);
      await onChanged({ message: response.data.message, error: false });
    } catch (failure) {
      setReview(false);
      setError(getApiErrorMessage(failure, "Unable to update the archive. Please try again."));
      if (failure.response?.status === 409) await onChanged({ message: getApiErrorMessage(failure), error: true });
    } finally { setSaving(false); }
  }
  return <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6" aria-labelledby="archive-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="archive-heading" className="text-lg font-semibold">{archived ? "Archived account" : "Remove account"}</h2><Link to="/admin/archive" className={`rounded-lg px-3 py-2 text-xs font-medium text-brand-royal ${focus}`}>Open removed-user folder</Link></div>
    <p className="mt-3 text-sm leading-relaxed text-brand-charcoal">{archived ? "This account is saved in the removed-user folder. Its profile, messages, and activity records are retained." : "Move this account to the removed-user folder. Access will end and its public profile will be hidden. Its records will be saved for restoration."}</p>
    {archived && <div className="mt-4 rounded-xl bg-brand-ivory p-4"><p className="whitespace-pre-wrap break-words text-sm">Removal reason: {archive.reason}</p><p className="mt-2 break-all text-xs text-gray-500">{date(archive.archivedAt)} (Lagos time) · Admin ID: {archive.archivedBy}</p></div>}
    <form className="mt-5" onSubmit={(event) => { event.preventDefault(); setError(""); if (reason.trim()) setReview(true); }}>
      <fieldset disabled={disabled || saving || review}><legend className="sr-only">{archived ? "Restore account from archive" : "Archive account"}</legend><label className="flex flex-col gap-2 text-xs font-medium">{archived ? "Restoration reason" : "Removal reason"}<textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className={`resize-y rounded-lg border border-brand-navy/15 px-3 py-2 text-sm ${focus}`} /></label><button type="submit" disabled={!reason.trim()} className={`mt-4 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${focus}`}>{archived ? "Review restoration" : "Review removal"}</button></fieldset>
      {review && <div className="mt-4 rounded-xl border border-brand-navy/15 bg-brand-ivory p-4" role="group" aria-label="Confirm archive action"><p className="text-sm font-semibold">{archived ? "Restore" : "Archive"} {account.username}?</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{reason.trim()}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{archived ? "Existing bans or suspensions will still apply. The user must sign in again." : "Existing sessions will end. Saved records can be restored by an admin."}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={submit} disabled={saving || disabled} className={`rounded-lg bg-brand-royal px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${focus}`}>{saving ? "Saving..." : archived ? "Confirm restoration" : "Confirm removal"}</button><button type="button" onClick={() => setReview(false)} disabled={saving} className={`rounded-lg px-4 py-2 text-sm ${focus}`}>Cancel</button></div></div>}
    </form>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  </section>;
}
