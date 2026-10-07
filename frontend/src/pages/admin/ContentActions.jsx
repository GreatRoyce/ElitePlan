import { useState } from "react";
import api, { getApiErrorMessage } from "../../utils/axios";
import { verificationInput as input, verificationFocus as focus } from "../../utils/profileVerification";

export default function ContentActions({ data, disabled, onChanged }) {
  const [reason, setReason] = useState(""), [review, setReview] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  if (!data.canManage) return <p className="mt-6 rounded-xl bg-white p-5 text-sm text-gray-500">You have access to review this listing. Hiding or restoring it requires permission to moderate published content.</p>;
  const action = data.moderation.hidden ? "restore" : "hide", label = action === "hide" ? "Hide listing" : "Restore listing";
  async function submit() {
    setSaving(true); setError("");
    try {
      const response = await api.post(`/admin/content/${data.profile.type}/${data.profile._id}`, { action, reason: reason.trim(), expectedVersion: data.moderation.version });
      setReview(false); await onChanged({ message: response.data.message });
    } catch (failure) {
      setReview(false); setError(getApiErrorMessage(failure, "Unable to change listing visibility."));
      if (failure.response?.status === 409) await onChanged({ error: true, message: getApiErrorMessage(failure) });
    } finally { setSaving(false); }
  }
  return <section className="mt-6 rounded-2xl bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">{label}</h2><p className="mt-2 text-sm text-gray-600">{action === "hide" ? "Hiding removes the listing from directories, profile links, and saved listings, and stops new consultation requests. The owner can edit it while it awaits staff review." : "Review the current text and media before restoring the listing to directories and saved listings."} Existing consultations and conversations are preserved.</p><form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) setReview(true); }} className="mt-4"><fieldset disabled={disabled || saving || review}><legend className="sr-only">Listing visibility action</legend><label className="text-xs font-medium">Reason shown to the owner<textarea required rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={`mt-2 resize-y ${input}`} /></label><button disabled={!reason.trim()} className={`mt-4 rounded-lg bg-brand-navy px-4 py-2 text-sm text-white disabled:opacity-40 ${focus}`}>Review change</button></fieldset>{review && <div role="group" aria-label="Confirm listing visibility change" className="mt-4 rounded-xl bg-brand-ivory p-4"><p className="text-sm font-semibold">{label}: {data.profile.name}?</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{reason.trim()}</p><div className="mt-4 flex gap-3"><button type="button" disabled={saving || disabled} onClick={submit} className={`rounded-lg bg-brand-royal px-4 py-2 text-sm text-white disabled:opacity-40 ${focus}`}>{saving ? "Saving..." : `Confirm: ${label.toLowerCase()}`}</button><button type="button" disabled={saving} onClick={() => setReview(false)} className={`rounded px-4 py-2 text-sm ${focus}`}>Cancel</button></div></div>}</form>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</section>;
}
