import { useState } from "react";
import api, { getApiErrorMessage } from "../../utils/axios";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
const labels = { appoint: "Appoint moderator", update: "Update permissions", revoke: "Revoke moderator access" };
const date = (value) => new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos" });

export default function StaffAccess({ account, staff, version, disabled, onChanged }) {
  const moderator = account.role === "moderator";
  const [action, setAction] = useState(moderator ? "update" : "appoint");
  const [permissions, setPermissions] = useState(moderator ? ["users.read", ...staff.permissions.filter((permission) => permission !== "users.read")] : ["users.read", "users.warn"]);
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const eligible = moderator || (["client", "vendor", "planner"].includes(account.role) && account.accountStatus === "active");
  async function submit() {
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/admin/users/${account._id}/staff`, { action, reason: reason.trim(), expectedVersion: version, ...(action !== "revoke" ? { permissions } : {}) });
      setReview(false);
      await onChanged({ message: response.data.message, error: false });
    } catch (failure) {
      setReview(false);
      setError(getApiErrorMessage(failure, "Unable to update moderator access. Please try again."));
      if (failure.response?.status === 409) await onChanged({ message: getApiErrorMessage(failure), error: true });
    } finally { setSaving(false); }
  }
  const permissionLabel = (key) => staff.permissionOptions.find((option) => option.key === key)?.label || key;
  function togglePermission(key, checked) {
    const area = key.split(".")[0];
    setPermissions((current) => checked ? [...new Set([...current, key, ...(key.endsWith(".manage") ? [`${area}.read`] : [])])] : current.filter((permission) => permission !== key && !(key.endsWith(".read") && permission === `${area}.manage`)));
  }
  return <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6" aria-labelledby="staff-heading">
    <h2 id="staff-heading" className="text-lg font-semibold">Moderator access</h2>
    <p className="mt-3 text-sm leading-relaxed text-brand-charcoal">{moderator ? `This moderator can: ${staff.permissions.map(permissionLabel).join(", ") || "no assigned actions"}. Revocation restores their original ${staff.memberRole || "member"} role.` : "Appoint this account to oversee members. Its member profile will be retained and hidden while it has a staff role. Use a dedicated staff account where possible."}</p>
    {eligible ? <form className="mt-5" onSubmit={(event) => { event.preventDefault(); setError(""); if (reason.trim()) setReview(true); }}>
      <fieldset disabled={disabled || saving || review} className="space-y-4"><legend className="sr-only">Manage moderator access</legend>
        {moderator && <label className="flex flex-col gap-2 text-xs font-medium">Action<select value={action} onChange={(event) => setAction(event.target.value)} className={`w-fit rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm ${focus}`}><option value="update">Update permissions</option><option value="revoke">Revoke moderator access</option></select></label>}
        {action !== "revoke" && <div><p className="text-xs font-medium">Permissions</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{staff.permissionOptions.map((option) => <label key={option.key} className="flex items-start gap-3 rounded-xl border border-brand-navy/10 p-3"><input type="checkbox" checked={permissions.includes(option.key)} disabled={option.key === "users.read"} onChange={(event) => togglePermission(option.key, event.target.checked)} className={`mt-1 accent-brand-navy ${focus}`} /><span><span className="text-sm font-medium">{option.label}{option.key === "users.read" ? " (required)" : ""}</span><span className="mt-1 block text-xs leading-relaxed text-gray-500">{option.description}</span></span></label>)}</div></div>}
        <label className="flex flex-col gap-2 text-xs font-medium">Reason<textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className={`resize-y rounded-lg border border-brand-navy/15 px-3 py-2 text-sm ${focus}`} /></label>
        <button type="submit" disabled={!reason.trim()} className={`rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${focus}`}>Review staff change</button>
      </fieldset>
      {review && <div className="mt-4 rounded-xl border border-brand-navy/15 bg-brand-ivory p-4" role="group" aria-label="Confirm staff change"><p className="text-sm font-semibold">{labels[action]} for {account.username}?</p>{action !== "revoke" && <p className="mt-2 text-sm">Permissions: {permissions.map(permissionLabel).join(", ")}</p>}<p className="mt-2 whitespace-pre-wrap break-words text-sm">{reason.trim()}</p><p className="mt-2 text-xs text-gray-500">Existing sessions will end. The user must sign in again.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={submit} disabled={saving || disabled} className={`rounded-lg bg-brand-royal px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${focus}`}>{saving ? "Saving..." : "Confirm staff change"}</button><button type="button" onClick={() => setReview(false)} disabled={saving} className={`rounded-lg px-4 py-2 text-sm ${focus}`}>Cancel</button></div></div>}
    </form> : <p className="mt-4 text-sm text-gray-500">{account.role === "admin" ? "Admin accounts are protected from these controls." : "Restore the account's active access before appointing it as a moderator."}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <details className="mt-5 border-t border-gray-100 pt-4"><summary className={`w-fit cursor-pointer rounded text-sm font-medium ${focus}`}>Recent staff changes ({staff.history.length})</summary>{staff.history.length ? <ul className="mt-4 divide-y divide-gray-100">{staff.history.map((entry) => <li key={entry._id} className="py-4"><p className="text-sm font-semibold">{labels[entry.action]}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.reason}</p><p className="mt-2 text-xs text-gray-500">{entry.action === "revoke" ? `Returned to ${entry.memberRole}` : `Permissions: ${entry.permissions.map(permissionLabel).join(", ")}`}</p><p className="mt-2 break-all text-xs text-gray-500">{date(entry.at)} (Lagos time) · Admin ID: {entry.by}</p></li>)}</ul> : <p className="mt-4 text-sm text-gray-500">No staff changes recorded.</p>}</details>
  </section>;
}
