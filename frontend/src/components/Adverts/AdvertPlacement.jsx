import { useEffect, useState } from "react";
import { useAuth } from "../../context/authStore";
import { advertFeed, advertKey, liveAdverts, nextAdvert, ROTATION_SECONDS } from "../../utils/adverts";
import { announcementFocus as focus } from "../../utils/announcements";
import AdvertCard from "./AdvertCard";

export function AdvertCarousel({ adverts }) {
  const [cursor, setCursor] = useState(""), [clock, setClock] = useState(Date.now);
  const [paused, setPaused] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [hidden, setHidden] = useState(false), [reducedMotion, setReducedMotion] = useState(false);
  const live = liveAdverts(adverts), current = live.find((a) => advertKey(a) === cursor) || live[0], key = current ? advertKey(current) : "";
  useEffect(() => {
    const visibility = () => { setHidden(document.visibilityState !== "visible"); setClock(Date.now()); };
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(preference.matches);
    visibility(); motion(); document.addEventListener("visibilitychange", visibility); preference.addEventListener("change", motion);
    return () => { document.removeEventListener("visibilitychange", visibility); preference.removeEventListener("change", motion); };
  }, []);
  useEffect(() => {
    if (hidden) return;
    const entries = liveAdverts(adverts), auto = entries.length > 1 && !paused && !hovered && !focused && !reducedMotion;
    const expiry = Math.min(...entries.filter((a) => a.endsAt).map((a) => new Date(a.endsAt).getTime() - Date.now()));
    const delay = Math.min(auto ? ROTATION_SECONDS * 1000 : Infinity, expiry);
    if (!Number.isFinite(delay)) return;
    const timer = setTimeout(() => {
      const now = Date.now(); setClock(now);
      if (auto) { const next = nextAdvert(liveAdverts(adverts, now), key); if (next) setCursor(advertKey(next)); }
    }, Math.max(10, delay));
    return () => clearTimeout(timer);
  }, [adverts, key, paused, hovered, focused, hidden, reducedMotion, clock]);
  if (!current) return null;
  const move = (direction) => { const now = Date.now(), next = nextAdvert(liveAdverts(adverts, now), key, direction); setClock(now); if (next) setCursor(advertKey(next)); };
  return <aside aria-label="Sponsored adverts" aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }} className="my-6">
    <div aria-live="off"><AdvertCard key={key} advert={current} /></div>
    {live.length > 1 && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><button type="button" onClick={() => move(-1)} aria-label="Previous advert" className={`rounded-lg border border-brand-navy/15 px-3 py-2 ${focus}`}>Previous</button><span>{live.findIndex((a) => advertKey(a) === key) + 1} of {live.length}</span><button type="button" onClick={() => move(1)} aria-label="Next advert" className={`rounded-lg border border-brand-navy/15 px-3 py-2 ${focus}`}>Next</button><button type="button" onClick={() => setPaused((v) => !v)} disabled={reducedMotion} aria-pressed={paused || reducedMotion} className={`rounded-lg border border-brand-navy/15 px-3 py-2 disabled:opacity-50 ${focus}`}>{paused || reducedMotion ? "Rotation paused" : "Pause rotation"}</button><span className="text-xs text-gray-500">{reducedMotion ? "Automatic rotation is off for reduced motion." : "Changes every 15 seconds; pauses while hovered or focused."}</span></div>}
  </aside>;
}

export default function AdvertPlacement({ placement }) {
  const { user, loading } = useAuth(), member = ["client", "vendor", "planner"].includes(user?.role);
  const identity = `${user?.id || "guest"}:${user?.role || "guest"}:${placement}`;
  const enabled = !loading && !["admin", "moderator"].includes(user?.role) && (placement === "home" || placement === "dashboard" && member);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false, controller;
    async function load() {
      if (document.visibilityState === "hidden") return;
      controller?.abort(); controller = new AbortController(); const signal = controller.signal, feed = advertFeed(member);
      try { const r = await feed.client.get(feed.path, { params: { placement }, signal, timeout: 5000 }); if (!stopped && !signal.aborted) setResult({ identity, adverts: r.data.data.adverts }); }
      catch { if (!stopped && !signal.aborted) setResult(null); }
    }
    load(); const timer = setInterval(load, 60000); window.addEventListener("focus", load); document.addEventListener("visibilitychange", load);
    return () => { stopped = true; controller?.abort(); clearInterval(timer); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load); };
  }, [enabled, member, identity, placement]);
  if (!enabled || result?.identity !== identity || !result.adverts?.length) return null;
  return <AdvertCarousel key={identity} adverts={result.adverts} />;
}
