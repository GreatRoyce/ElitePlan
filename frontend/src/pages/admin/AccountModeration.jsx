import { useState } from "react";
import api, { getApiErrorMessage } from "../../utils/axios";
import { useAuth } from "../../context/authStore";
import { hasStaffPermission } from "../../utils/staffAccess";

const labels = { warn: "Issue warning", suspend: "Suspend account", ban: "Ban account", restore: "Restore access", archive: "Archive account", unarchive: "Restore from archive" };
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
const date = (value) => new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos" });

export default function AccountModeration({ account, moderation, disabled, onChanged }) {
  const { user } = useAuth();
  const actions = (moderation.status === "active" ? ["warn", "suspend", "ban"] : moderation.status === "suspended" ? ["restore", "suspend", "ban"] : ["restore"]).filter((item) => hasStaffPermission(user, `users.${item}`));
  const [selectedAction, setAction] = useState(actions[0] || "");
  const action = actions.includes(selectedAction) ? selectedAction : actions[0] || "";
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const staff = !["client", "vendor", "planner"].includes(account.role);

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/admin/users/${account._id}/moderation`, { action, reason: reason.trim(), expectedVersion: moderation.version, ...(action === "suspend" ? { durationHours: Number(hours) } : {}) });
      setReason("");
      setReview(false);
      await onChanged({ message: response.data.message, error: false });
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Unable to update this account. Please try again."));
      setReview(false);
      if (failure.response?.status === 409) await onChanged({ message: getApiErrorMessage(failure), error: true });
    } finally { setSaving(false); }
  }

  return <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6" aria-labelledby="moderation-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="moderation-heading" className="text-lg font-semibold">Account moderation</h2><span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${moderation.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{moderation.status}</span></div>
    {moderation.reason && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-brand-charcoal">{moderation.status === "archived" ? "Retained restriction reason" : "Reason"}: {moderation.reason}</p>}
    {moderation.status === "suspended" && moderation.suspendedUntil && <p className="mt-2 text-xs text-gray-500">Suspended until {date(moderation.suspendedUntil)} (Lagos time).</p>}
    {staff ? <p className="mt-4 text-sm text-gray-500">Staff accounts are protected from member moderation.</p> : moderation.status === "archived" ? <p className="mt-4 text-sm text-gray-500">Restore the account from the archive to change its access restrictions.</p> : !actions.length ? <p className="mt-4 text-sm text-gray-500">Your permissions allow review only for this account's current status.</p> : <form className="mt-5" onSubmit={(event) => { event.preventDefault(); setError(""); if (reason.trim()) setReview(true); }}>
      <fieldset disabled={disabled || saving || review} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Choose a moderation action</legend>
        <label className="flex flex-col gap-2 text-xs font-medium">Action<select value={actions.includes(action) ? action : actions[0]} onChange={(event) => setAction(event.target.value)} className={`rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm ${focus}`}>{actions.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
        {action === "suspend" && <label className="flex flex-col gap-2 text-xs font-medium">Duration<select value={hours} onChange={(event) => setHours(event.target.value)} className={`rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm ${focus}`}>{[[1, "1 hour"], [24, "24 hours"], [72, "3 days"], [168, "7 days"], [720, "30 days"], [2160, "90 days"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className="flex flex-col gap-2 text-xs font-medium sm:col-span-2">Reason<textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className={`resize-y rounded-lg border border-brand-navy/15 px-3 py-2 text-sm ${focus}`} placeholder="Explain the decision. Restriction and warning reasons are visible to the user." /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={!reason.trim()} className={`rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${focus}`}>Review action</button></div>
      </fieldset>
      {review && <div className="mt-4 rounded-xl border border-brand-navy/15 bg-brand-ivory p-4" role="group" aria-label="Confirm moderation action"><p className="text-sm font-semibold">{labels[action]} for {account.username}?</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{reason.trim()}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{action === "suspend" ? `Access will be blocked for ${hours} hours and existing sessions will end.` : action === "ban" ? "Access will be blocked until an admin restores it. Existing sessions will end." : action === "restore" ? "The user will need to sign in again." : "The user can continue using the site and will see this warning."}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={submit} disabled={saving || disabled} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${action === "ban" || action === "suspend" ? "bg-brand-royal" : "bg-brand-navy"} ${focus}`}>{saving ? "Saving..." : "Confirm action"}</button><button type="button" onClick={() => setReview(false)} disabled={saving} className={`rounded-lg px-4 py-2 text-sm ${focus}`}>Cancel</button></div></div>}
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <details className="mt-5 border-t border-gray-100 pt-4"><summary className={`w-fit cursor-pointer rounded text-sm font-medium ${focus}`}>Recent moderation history ({moderation.history.length})</summary>{moderation.history.length ? <ul className="mt-4 divide-y divide-gray-100">{moderation.history.map((entry) => <li key={entry._id} className="py-4"><p className="text-sm font-semibold">{labels[entry.action]}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-brand-charcoal">{entry.reason}</p><p className="mt-2 break-all text-xs text-gray-500">{date(entry.at)} · Admin ID: {entry.by}</p>{entry.until && <p className="mt-1 text-xs text-gray-500">Until {date(entry.until)}</p>}</li>)}</ul> : <p className="mt-4 text-sm text-gray-500">No moderation actions recorded.</p>}</details>
  </section>;
}
