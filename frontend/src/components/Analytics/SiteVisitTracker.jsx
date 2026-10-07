import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import { createVisitTracker, externalReferrer } from "../../utils/siteVisits";

const track = createVisitTracker({
  storage: () => window.localStorage,
  now: () => Date.now(),
  uuid: () => window.crypto.randomUUID(),
  referrer: () => externalReferrer(document.referrer, window.location.hostname),
  send: (payload) => {
    const base = import.meta.env.VITE_API_URL;
    if (!base) return;
    // Telemetry has no auth header or auth interceptors and cannot log someone out.
    return fetch(`${base.replace(/\/$/, "")}/analytics/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      keepalive: true,
      body: JSON.stringify(payload),
    });
  },
});

export default function SiteVisitTracker() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const role = user?.role;

  useEffect(() => {
    track({ path: pathname, role, loading, optedOut: navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true });
  }, [pathname, role, loading]);

  return null;
}
