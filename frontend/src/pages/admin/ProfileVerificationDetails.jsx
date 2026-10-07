import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import VerificationActions from "./VerificationActions";
import api, { getApiErrorMessage } from "../../utils/axios";
import { verificationLabels, verificationDate, verificationFocus, profileLink } from "../../utils/profileVerification";

function Fields({ entries }) {
  return <dl className="mt-4 divide-y divide-gray-100">{entries.map(([label, value]) => <div key={label} className="grid gap-1 py-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4"><dt className="text-gray-500">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{value ?? "Not provided"}</dd></div>)}</dl>;
}

export default function ProfileVerificationDetails() {
  const { type, profileId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const request = useRef(null);
  const key = `${type}:${profileId}`;
  const data = result?.key === key ? result.data : null;
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try { const response = await api.get(`/admin/verification/${encodeURIComponent(type)}/${encodeURIComponent(profileId)}`, { signal: controller.signal }); if (!controller.signal.aborted) setResult({ key: `${type}:${profileId}`, data: response.data.data }); }
    catch (failure) { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(failure, "Unable to load this professional profile.")); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [type, profileId]);
  useEffect(() => { load(); return () => request.current?.abort(); }, [load]);
  const links = data ? [
    ["Profile image", data.profile.profileImage], ["Website", data.profile.website],
    ...Object.entries(data.profile.socialLinks).map(([label, value]) => [label, value]),
    ...data.profile.gallery.map((value, index) => [`Gallery image ${index + 1}`, value]),
    ...data.profile.portfolioImages.map((value, index) => [`Portfolio image ${index + 1}`, value]),
  ].map(([label, value]) => [label, profileLink(value)]).filter(([, url]) => url) : [];
  return <AdminLayout loading={loading}>
    <Link to="/admin/verification" className={`rounded text-sm hover:underline ${verificationFocus}`}>Back to verification queue</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-brand-royal">Professional profile review</p><h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{data?.profile.organization || "Profile verification"}</h1></div><button disabled={loading} onClick={load} className={`rounded-lg bg-white px-4 py-2 text-sm disabled:opacity-50 ${verificationFocus}`}>Refresh</button></div>
    {notice?.key === key && <p role={notice.error ? "alert" : "status"} className={`mt-5 rounded-xl bg-white p-4 text-sm ${notice.error ? "text-red-700" : "text-emerald-800"}`}>{notice.message}</p>}
    {error && <p role="alert" className="mt-6 text-sm text-red-700">{error}</p>}
    {loading && !data && <p role="status" className="mt-6 text-sm">Loading profile…</p>}
    {data && <>
      <div className="mt-6 grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Business and contact details</h2><Fields entries={[["Profile type", data.profile.type], ["Business / company", data.profile.organization], ["Named contact", data.profile.name], ["Profile email", data.profile.email], ["Profile phone", data.profile.phone], ["Location", Object.values(data.profile.location).filter(Boolean).join(", ") || null], ["Category / specialty", data.profile.category || data.profile.specialization.join(", ") || null], ["Experience (years)", data.profile.yearsExperience], ["Biography", data.profile.bio], ["Certifications (submitted)", data.profile.certifications.join(", ") || null], ["Service regions", data.profile.serviceRegions.join(", ") || null], ["Last profile edit", verificationDate(data.profile.updatedAt)]]} /></section><section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Current verification</h2><Fields entries={[["Status", verificationLabels[data.verification.status]], ["Decision reason", data.verification.reason], ["Decision time (Lagos)", verificationDate(data.verification.at)], ["Approved time (Lagos)", verificationDate(data.verification.verifiedAt)], ["Account owner", data.owner.username], ["Account email", data.owner.email], ["Account access", data.owner.accountStatus]]} /><Link to={`/admin/users/${data.owner._id}`} className={`mt-4 inline-block rounded text-sm underline ${verificationFocus}`}>View owner account</Link><h3 className="mt-6 text-sm font-semibold">Profile media and links</h3>{links.length ? <ul className="mt-3 flex flex-wrap gap-3">{links.map(([label, url], index) => <li key={`${label}:${index}`}><a href={url} target="_blank" rel="noopener noreferrer" className={`rounded text-sm capitalize underline ${verificationFocus}`}>{label}</a></li>)}</ul> : <p className="mt-3 text-sm text-gray-500">No profile media or supported links provided.</p>}</section></div>
      <VerificationActions key={`${key}:${data.verification.version}`} data={data} disabled={loading || Boolean(error)} onChanged={async (message) => { setNotice({ ...message, key }); await load(); }} />
      <section className="mt-6 rounded-2xl bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Verification history</h2><p className="mt-2 text-xs text-gray-500">Visible to admins only. The most recent 100 changes are retained.</p>{data.verification.history.length ? <ul className="mt-4 divide-y divide-gray-100">{data.verification.history.map((entry) => <li key={entry._id} className="py-4"><p className="text-sm font-semibold">{entry.action === "profile_updated" ? "Profile details changed" : entry.action === "approve" ? "Verification approved" : entry.action === "reject" ? "Verification rejected" : "Verification revoked"}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.reason}</p><p className="mt-2 break-all text-xs text-gray-500">{verificationDate(entry.at)} (Lagos time) · Actor ID: {entry.by}</p></li>)}</ul> : <p className="mt-4 text-sm text-gray-500">No recorded decisions. Older verified profiles may predate this history.</p>}</section>
    </>}
  </AdminLayout>;
}
