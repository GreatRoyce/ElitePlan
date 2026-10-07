const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
let createVisitTracker;
let externalReferrer;

before(async () => {
  ({ createVisitTracker, externalReferrer } = await import("../../frontend/src/utils/siteVisits.js"));
});

function fixture(overrides = {}) {
  let timestamp = Date.parse("2026-10-07T10:00:00Z");
  const stored = new Map();
  const sent = [];
  const options = { storage: () => ({ getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) }), now: () => timestamp, uuid: randomUUID, referrer: () => "google.com", send: (payload) => sent.push(payload), ...overrides };
  return { track: createVisitTracker(options), sent, stored, options, advance: (ms) => { timestamp += ms; } };
}

test("strict effect replays and same-path navigation do not inflate page views", () => {
  const f = fixture();
  f.track({ path: "/", loading: true });
  assert.equal(f.sent.length, 0);
  f.track({ path: "/" });
  f.track({ path: "/" });
  f.track({ path: "/features-section" });
  f.track({ path: "/" });
  assert.equal(f.sent.length, 3);
  assert.equal(new Set(f.sent.map((view) => view.visitorId)).size, 1);
  assert.equal(new Set(f.sent.map((view) => view.sessionId)).size, 1);
  assert.equal(new Set(f.sent.map((view) => view.eventId)).size, 3);
});

test("staff, privacy opt-outs, unknown routes, and auth redirect destinations are excluded", () => {
  const f = fixture();
  for (const view of [{ path: "/admin", role: "admin" }, { path: "/", role: "admin" }, { path: "/lounge", role: "moderator" }, { path: "/", optedOut: true }, { path: "/?email=private" }, { path: "/unknown" }, { path: "/lounge" }, { path: "/", role: "client" }, { path: "/logout", role: "client" }]) f.track(view);
  assert.equal(f.sent.length, 0);
  f.track({ path: "/lounge", role: "client" });
  assert.equal(f.sent.length, 1);
});

test("sessions expire after 30 minutes of inactivity without changing the browser ID", () => {
  const f = fixture();
  f.track({ path: "/" });
  f.advance(29 * 60000);
  f.track({ path: "/features-section" });
  assert.equal(f.sent[0].sessionId, f.sent[1].sessionId);
  f.advance(30 * 60000);
  f.track({ path: "/how-it-works" });
  assert.notEqual(f.sent[1].sessionId, f.sent[2].sessionId);
  assert.equal(f.sent[0].visitorId, f.sent[2].visitorId);
  assert.equal(f.sent[2].referrerHost, "");
});

test("a reload keeps the visitor and active session while recording another page view", () => {
  const f = fixture();
  f.track({ path: "/" });
  const reloaded = createVisitTracker(f.options);
  reloaded({ path: "/" });
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[0].visitorId, f.sent[1].visitorId);
  assert.equal(f.sent[0].sessionId, f.sent[1].sessionId);
  assert.notEqual(f.sent[0].eventId, f.sent[1].eventId);
});

test("blocked or corrupt storage and failed sending do not interrupt navigation", async () => {
  const f = fixture({ storage: () => { throw new Error("Storage blocked"); } });
  f.track({ path: "/" });
  f.track({ path: "/features-section" });
  assert.equal(f.sent[0].visitorId, f.sent[1].visitorId);
  assert.equal(f.sent[0].sessionId, f.sent[1].sessionId);
  const corrupt = fixture();
  corrupt.stored.set("eliteplan:visitor", "invalid");
  corrupt.stored.set("eliteplan:visit-session", "invalid json");
  assert.doesNotThrow(() => corrupt.track({ path: "/" }));
  assert.match(corrupt.sent[0].visitorId, /^[a-f0-9-]{36}$/);
  const failure = fixture({ send: () => Promise.reject(new Error("Offline")) });
  assert.doesNotThrow(() => failure.track({ path: "/" }));
  await new Promise((resolve) => setImmediate(resolve));
});

test("external referrals contain only domains and internal or invalid referrals are direct", () => {
  assert.equal(externalReferrer("https://google.com/search?q=private", "eliteplan.netlify.app"), "google.com");
  assert.equal(externalReferrer("https://eliteplan.netlify.app/path?token=private", "eliteplan.netlify.app"), "");
  assert.equal(externalReferrer("javascript:private", "eliteplan.netlify.app"), "");
  assert.equal(externalReferrer("", "eliteplan.netlify.app"), "");
});
