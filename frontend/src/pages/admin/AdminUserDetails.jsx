import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api, { getApiErrorMessage } from "../../utils/axios";
import AdminLayout from "./AdminLayout";
import AccountModeration from "./AccountModeration";
import AccountArchive from "./AccountArchive";
import StaffAccess from "./StaffAccess";
import { useAuth } from "../../context/authStore";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
const date = (value) => value ? new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : "Unavailable";
const number = (value) => new Intl.NumberFormat().format(value);

function Fields({ entries }) {
  return <dl className="mt-4 divide-y divide-gray-100">{entries.map(([label, value]) => <div key={label} className="grid gap-1 py-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4"><dt className="text-gray-500">{label}</dt><dd className="min-w-0 break-words">{value || "Not provided"}</dd></div>)}</dl>;
}

export default function AdminUserDetails() {
  const { user: viewer } = useAuth();
  const moderator = viewer?.role === "moderator";
  const { userId } = useParams();
  const { search, pathname } = useLocation();
  const fromArchive = pathname.startsWith("/admin/archive/");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [moderationNotice, setModerationNotice] = useState(null);
  const request = useRef(null);
  const data = result?.id === userId ? result.data : null;

  const loadDetails = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/admin/users/${encodeURIComponent(userId)}`, { signal: controller.signal });
      if (!controller.signal.aborted) setResult({ id: userId, data: response.data.data });
    } catch (failure) {
      if (controller.signal.aborted) return;
      if ([400, 403, 404].includes(failure.response?.status)) setResult(null);
      if (failure.response?.status === 403) setForbidden(true);
      setError(getApiErrorMessage(failure, "Unable to load user details. Please try again."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDetails();
    return () => request.current?.abort();
  }, [loadDetails]);

  return (
    <AdminLayout loading={loading}>
      <Link to={`${moderator ? "/moderator" : fromArchive ? "/admin/archive" : "/admin/users"}${search}`} className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-charcoal hover:bg-white ${focus}`}><ArrowLeft size={16} aria-hidden="true" />{fromArchive ? "Back to removed users" : "Back to users"}</Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-brand-royal">Account details</p><h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{data?.user.username || "User details"}</h1><p className="mt-2 text-sm text-brand-charcoal">Account information and recorded platform activity.</p></div>
        <button type="button" onClick={loadDetails} disabled={loading || forbidden} className={`inline-flex items-center gap-2 rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 ${focus}`}><RefreshCw size={16} aria-hidden="true" className={loading ? "motion-safe:animate-spin" : ""} />{loading ? "Loading..." : "Refresh"}</button>
      </header>
      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{data && <p className="mt-1">The details below are from the last successful update.</p>}</div>}
      {loading && !data && <p role="status" className="mt-8 text-sm text-gray-500">Loading account details...</p>}
      {data && <>
        {moderationNotice?.id === userId && <p role={moderationNotice.error ? "alert" : "status"} className={`mt-5 rounded-xl bg-white p-4 text-sm ${moderationNotice.error ? "text-red-700" : "text-emerald-800"}`}>{moderationNotice.message}</p>}
        {!moderator && <AccountArchive key={`archive:${data.user._id}:${data.moderation.version}`} account={data.user} archive={data.archive} version={data.moderation.version} disabled={loading || forbidden || Boolean(error)} onChanged={async (notice) => { setModerationNotice({ ...notice, id: userId }); await loadDetails(); }} />}
        {!moderator && data.staff && <StaffAccess key={`staff:${data.user._id}:${data.moderation.version}`} account={data.user} staff={data.staff} version={data.moderation.version} disabled={loading || forbidden || Boolean(error)} onChanged={async (notice) => { setModerationNotice({ ...notice, id: userId }); await loadDetails(); }} />}
        <AccountModeration key={`${data.user._id}:${data.moderation.version}:${data.moderation.status}`} account={data.user} moderation={data.moderation} disabled={loading || forbidden || Boolean(error)} onChanged={async (notice) => { setModerationNotice({ ...notice, id: userId }); await loadDetails(); }} />
        {!moderator && data.profile && ["vendor", "planner"].includes(data.user.role) && !data.user.archivedAt && <Link to={`/admin/verification/${data.profile.role}/${data.profile._id}`} className={`mt-5 inline-block rounded-lg bg-white px-4 py-2.5 text-sm underline ${focus}`}>Review profile verification</Link>}
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Account</h2><Fields entries={[["Username", data.user.username], ["Email", data.user.email], ["Phone", data.user.phone], ["Role", <span key="role" className="capitalize">{data.user.role}</span>], ["Joined", date(data.user.createdAt)], ["Last updated", date(data.user.updatedAt)], ["Account ID", data.user._id]]} /><p className="mt-4 text-xs text-gray-500">Timestamps shown in Lagos time.</p></section>
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Profile</h2>{data.profile ? <>
            <Fields entries={[["Name", data.profile.name], ...(data.profile.role !== "client" ? [["Business / company", data.profile.organization]] : []), ["Profile email", data.profile.email], ["Profile phone", data.profile.phone], ["Location", Object.values(data.profile.location).filter(Boolean).join(", ")], ...(data.profile.role === "vendor" ? [["Category", data.profile.category]] : []), ...(data.profile.role === "planner" ? [["Specialization", data.profile.specialization.join(", ")]] : []), ...(data.profile.verified !== null ? [["Verification", data.profile.verified ? "Verified" : "Unverified"]] : []), ...(data.profile.listingActive !== null ? [["Profile listing", data.profile.listingActive ? "Active" : "Inactive"]] : [])]} />
            {data.profile.bio && <div className="mt-4 border-t border-gray-100 pt-4"><h3 className="text-xs font-medium text-gray-500">About</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{data.profile.bio}</p></div>}
            {data.profile.listingActive !== null && <p className="mt-4 text-xs text-gray-500">Listing status describes the professional profile.</p>}
          </> : <p className="mt-5 text-sm text-gray-500">{data.user.role === "admin" ? "Admin accounts do not have a member profile." : "No profile has been created for this account."}</p>}</section>
        </div>
        <section className="mt-6" aria-label="Account activity"><h2 className="text-lg font-semibold">Activity totals</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[["Consultations sent", data.activity.consultationsSent], ["Consultations received", data.activity.consultationsReceived], ["Messages sent", data.activity.messagesSent], ["Messages received", data.activity.messagesReceived], ["Linked event records", data.activity.eventCount]].map(([label, value]) => <div key={label} className="rounded-2xl border border-brand-navy/10 bg-white p-5"><p className="text-sm text-brand-charcoal">{label}</p><p className="mt-3 text-3xl font-bold">{number(value)}</p></div>)}</div></section>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Recent consultations</h2><p className="mt-2 text-xs text-gray-500">The five most recent requests involving this account.</p>{data.recentConsultations.length ? <ul className="mt-4 divide-y divide-gray-100">{data.recentConsultations.map((item) => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="break-words text-sm font-medium">{item.eventType}</p><p className="mt-1 text-xs text-gray-500">{item.direction} · <span className="capitalize">{item.status}</span></p></div><p className="text-xs text-gray-500">Event: {date(item.eventDate)}</p></li>)}</ul> : <p className="mt-5 text-sm text-gray-500">No consultation activity yet.</p>}</section>
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Recent linked events</h2><p className="mt-2 text-xs text-gray-500">The five most recently created event records linked to this profile.</p>{data.recentEvents.length ? <ul className="mt-4 divide-y divide-gray-100">{data.recentEvents.map((item) => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="break-words text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-gray-500">{item.status}</p></div><p className="text-xs text-gray-500">{date(item.date)}</p></li>)}</ul> : <p className="mt-5 text-sm text-gray-500">No event records are linked to this profile.</p>}</section>
        </div>
      </>}
    </AdminLayout>
  );
}
