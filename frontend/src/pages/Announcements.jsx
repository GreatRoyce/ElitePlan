import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authStore";
import { getApiErrorMessage } from "../utils/axios";
import { announcementFeed, isAnnouncementMember, publicationKey, currentAnnouncement, announcementFocus as focus } from "../utils/announcements";
import AnnouncementCard from "../components/Announcements/AnnouncementCard";

export function AnnouncementList({ announcements, member, onAcknowledged }) {
  return announcements.length ? <div className="mt-6 space-y-4">{announcements.map((a) => <AnnouncementCard key={publicationKey(a)} announcement={a} member={member} onAcknowledged={onAcknowledged} />)}</div> : <p className="mt-6 rounded-xl bg-white p-5 text-sm">No announcements are currently available.</p>;
}
export default function Announcements() {
  const { user, loading: authLoading } = useAuth(), member = isAnnouncementMember(user), identity = `${user?.id || "guest"}:${user?.role || "guest"}`;
  const [page, setPage] = useState(1), [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const key = `${identity}:${page}`, data = result?.key === key ? result.data : null;
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController(); setLoading(true); setError(""); const feed = announcementFeed(member);
    feed.client.get(feed.path, { params: { page }, signal: controller.signal }).then((r) => { if (!controller.signal.aborted) setResult({ key: `${identity}:${page}`, data: r.data.data }); }).catch((e) => { if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(e, "Unable to load announcements.")); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [identity, page, member, authLoading, refresh]);
  return <main className="min-h-screen bg-brand-ivory p-5 text-brand-navy sm:p-8" aria-busy={loading}><div className="mx-auto max-w-5xl"><Link to={member ? "/lounge" : user?.role === "admin" ? "/admin" : user?.role === "moderator" ? "/moderator" : "/"} className={`rounded text-sm underline ${focus}`}>Back to {user ? "dashboard" : "home"}</Link><div className="mt-8 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Announcements</h1><p className="mt-3 text-sm text-gray-600">{member ? "Current notices for your account. Acknowledged notices remain available here until they expire or are withdrawn." : "Current public notices from ElitePlan."}</p></div><button onClick={() => setRefresh((v) => v + 1)} disabled={loading} className={`rounded-lg bg-white px-4 py-3 text-sm disabled:opacity-40 ${focus}`}>Refresh</button></div>{loading && <p role="status" className="mt-6 text-sm">Loading announcements...</p>}{error && <p role="alert" className="mt-6 text-sm text-red-700">{error}</p>}{data && !loading && !error && <><AnnouncementList member={member} announcements={data.announcements.filter((a) => currentAnnouncement(a))} onAcknowledged={() => setRefresh((v) => v + 1)} /><div className="mt-6 flex flex-wrap items-center gap-4 text-sm"><button disabled={data.pagination.page <= 1} onClick={() => setPage(data.pagination.page - 1)} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)}</span><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setPage(data.pagination.page + 1)} className={`rounded bg-white p-3 disabled:opacity-40 ${focus}`}>Next</button></div></>}</div></main>;
}
