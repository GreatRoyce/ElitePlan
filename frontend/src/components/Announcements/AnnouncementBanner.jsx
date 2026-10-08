import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import { announcementFeed, isAnnouncementMember, guestDismissals, dismissGuest, publicationKey, currentAnnouncement, announcementFocus as focus } from "../../utils/announcements";
import AnnouncementCard from "./AnnouncementCard";

export function AnnouncementStrip({ announcements, member, onAcknowledged, onDismiss }) {
  return <aside aria-label="Site announcements" className="border-b border-brand-navy/10 bg-brand-ivory px-5 py-4 text-brand-navy"><div className="mx-auto max-w-5xl"><div className="grid gap-3">{announcements.map((a) => <AnnouncementCard key={publicationKey(a)} announcement={a} compact member={member} onAcknowledged={onAcknowledged} onDismiss={onDismiss} />)}</div><Link to="/announcements" className={`mt-3 inline-block rounded text-sm underline ${focus}`}>Read all announcements</Link></div></aside>;
}
export default function AnnouncementBanner() {
  const { user, loading } = useAuth(), { pathname } = useLocation();
  const member = isAnnouncementMember(user), identity = `${user?.id || "guest"}:${user?.role || "guest"}`;
  const enabled = !loading && !["admin", "moderator"].includes(user?.role) && !pathname.startsWith("/support") && !pathname.startsWith("/admin") && !pathname.startsWith("/moderator") && pathname !== "/announcements" && pathname !== "/logout";
  const [result, setResult] = useState(null), [dismissed, setDismissed] = useState(guestDismissals);
  useEffect(() => {
    if (!enabled) return;
    let controller, stopped = false;
    async function load() {
      if (document.visibilityState === "hidden") return;
      controller?.abort(); controller = new AbortController(); const signal = controller.signal, feed = announcementFeed(member);
      try { const r = await feed.client.get(feed.path, { params: { pageSize: 20 }, signal }); if (!stopped && !signal.aborted) setResult({ identity, announcements: r.data.data.announcements }); }
      catch { if (!stopped && !signal.aborted) setResult(null); }
    }
    load(); const timer = setInterval(load, 60000); window.addEventListener("focus", load); document.addEventListener("visibilitychange", load);
    return () => { stopped = true; controller?.abort(); clearInterval(timer); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load); };
  }, [enabled, member, identity, pathname]);
  const announcements = enabled && result?.identity === identity ? result.announcements.filter((a) => currentAnnouncement(a) && (member ? !a.acknowledgedAt : !dismissed.includes(publicationKey(a)))).slice(0, 3) : [];
  if (!announcements.length) return null;
  return <AnnouncementStrip announcements={announcements} member={member} onAcknowledged={(a) => setResult((r) => r?.identity === identity ? { ...r, announcements: r.announcements.map((entry) => publicationKey(entry) === publicationKey(a) ? { ...entry, acknowledgedAt: new Date().toISOString() } : entry) } : r)} onDismiss={(a) => setDismissed((previous) => [...new Set([...previous, ...dismissGuest(a), publicationKey(a)])].slice(-100))} />;
}
