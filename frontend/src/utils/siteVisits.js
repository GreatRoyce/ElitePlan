const VISITOR_KEY = "eliteplan:visitor";
const SESSION_KEY = "eliteplan:visit-session";
const IDLE_LIMIT = 30 * 60 * 1000;
const publicPaths = new Set(["/", "/features-section", "/why-choose-section", "/how-it-works", "/login", "/register"]);
const memberPaths = new Set(["/lounge", "/clientpresence", "/suite", "/consult"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function externalReferrer(referrer, currentHost) {
  try {
    const url = new URL(referrer);
    return ["http:", "https:"].includes(url.protocol) && url.hostname !== currentHost ? url.hostname : "";
  } catch {
    return "";
  }
}

// Dependencies are supplied by the browser wrapper; storage failure falls back to memory.
export function createVisitTracker({ storage, now, uuid, referrer, send }) {
  const memory = new Map();
  let lastPath;
  function read(key) {
    try { return storage()?.getItem(key) ?? memory.get(key); }
    catch { return memory.get(key); }
  }
  function write(key, value) {
    memory.set(key, value);
    try { storage()?.setItem(key, value); } catch { /* Navigation still works without storage. */ }
  }

  return function track({ path, role, loading, optedOut = false }) {
    if (loading || optedOut || role === "admin" || role === "moderator") return;
    if ((!role && !publicPaths.has(path)) || (role && !memberPaths.has(path))) return;
    // React StrictMode and query/hash changes should not create extra page views.
    if (path === lastPath) return;
    const firstPageView = lastPath === undefined;
    lastPath = path;
    try {
      let visitorId = read(VISITOR_KEY);
      if (typeof visitorId !== "string" || !uuidPattern.test(visitorId)) {
        visitorId = uuid();
        write(VISITOR_KEY, visitorId);
      }
      let session;
      try { session = JSON.parse(read(SESSION_KEY) || "null"); } catch { session = null; }
      const timestamp = now();
      const idle = timestamp - session?.lastActive;
      if (!uuidPattern.test(session?.id || "") || !Number.isFinite(idle) || idle < 0 || idle >= IDLE_LIMIT || typeof session?.referrerHost !== "string") {
        session = { id: uuid(), referrerHost: firstPageView ? referrer() : "", lastActive: timestamp };
      } else {
        session.lastActive = timestamp;
      }
      write(SESSION_KEY, JSON.stringify(session));
      Promise.resolve(send({ eventId: uuid(), visitorId, sessionId: session.id, path, referrerHost: session.referrerHost })).catch(() => {});
    } catch { /* Analytics failures must not interrupt the site. */ }
  };
}
