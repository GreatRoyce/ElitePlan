const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const SiteVisit = require("../src/microservices/analytics/analytics.model");
const { parseRange, formatReport, reportPipeline } = require("../src/microservices/analytics/analytics.service");
const visitRoutes = require("../src/microservices/analytics/analytics.routes");
const adminRoutes = require("../src/routes/admin.routes");

let server;
let base;
let role;
let moderatorPermissions;
let records;
let aggregateCalls;
let lastPipeline;
let failDatabase;
const originals = { create: SiteVisit.create, aggregate: SiteVisit.aggregate, findById: User.findById };
const originalSecret = process.env.JWT_SECRET;
const originalAnalyticsSecret = process.env.ANALYTICS_SECRET;
const secret = "analytics-tests-only-secret";

before(async () => {
  process.env.JWT_SECRET = secret;
  delete process.env.ANALYTICS_SECRET;
  User.findById = () => ({ select: async () => role ? { _id: "staff", role, moderatorPermissions } : null });
  SiteVisit.create = async (record) => {
    if (failDatabase) throw new Error("Private connection details");
    if (records.some((item) => item.eventId === record.eventId)) throw Object.assign(new Error("Duplicate"), { code: 11000 });
    records.push(record);
  };
  SiteVisit.aggregate = async (pipeline) => {
    aggregateCalls += 1;
    lastPipeline = pipeline;
    if (failDatabase) throw new Error("Private connection details");
    return [{ pageViews: [], visitors: [], visits: [], daily: [], pages: [], referrers: [] }];
  };
  const app = express();
  app.use("/analytics", visitRoutes);
  app.use(express.json());
  app.use("/admin", adminRoutes);
  app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(error.status || 500).json({ message: "Request rejected" });
  });
  server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => { role = "admin"; moderatorPermissions = []; records = []; aggregateCalls = 0; failDatabase = false; lastPipeline = null; });
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  SiteVisit.create = originals.create;
  SiteVisit.aggregate = originals.aggregate;
  User.findById = originals.findById;
  if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
  if (originalAnalyticsSecret === undefined) delete process.env.ANALYTICS_SECRET; else process.env.ANALYTICS_SECRET = originalAnalyticsSecret;
});

const visit = (overrides = {}) => ({ eventId: randomUUID(), visitorId: randomUUID(), sessionId: randomUUID(), path: "/", referrerHost: "Google.COM", ...overrides });
const post = (body, userAgent = "Mozilla/5.0") => fetch(`${base}/analytics/visits`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": userAgent }, body: JSON.stringify(body) });
const authToken = () => jwt.sign({ id: "staff", role: "admin" }, secret);
const get = (query = "", auth = authToken()) => fetch(`${base}/admin/analytics${query}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });

test("page views are accepted without login and stored without browser IDs, IPs, or account data", async () => {
  const body = visit();
  assert.equal((await post(body)).status, 204);
  assert.equal(records.length, 1);
  const record = records[0];
  assert.deepEqual(Object.keys(record).sort(), ["eventId", "path", "referrerHost", "sessionKey", "visitorKey"]);
  assert.match(record.visitorKey, /^[a-f0-9]{64}$/);
  assert.match(record.sessionKey, /^[a-f0-9]{64}$/);
  assert.equal(record.referrerHost, "google.com");
  assert.ok(!JSON.stringify(record).includes(body.visitorId));
  assert.ok(!JSON.stringify(record).includes(body.sessionId));
});

test("duplicate submissions are idempotent and page events keep stable visitor/session keys", async () => {
  const body = visit();
  assert.equal((await post(body)).status, 204);
  assert.equal((await post(body)).status, 204);
  assert.equal(records.length, 1);
  await post({ ...body, eventId: randomUUID(), path: "/features-section" });
  assert.equal(records.length, 2);
  assert.equal(records[0].visitorKey, records[1].visitorKey);
  assert.equal(records[0].sessionKey, records[1].sessionKey);
  await post({ ...body, eventId: randomUUID(), visitorId: randomUUID() });
  assert.notEqual(records[0].sessionKey, records[2].sessionKey);
});

test("invalid identifiers, private paths, query strings, extra fields, and full referral URLs are rejected", async () => {
  for (const overrides of [{ eventId: "fake" }, { visitorId: {} }, { sessionId: "fake" }, { path: "/admin" }, { path: "/admin/analytics" }, { path: "/?token=private" }, { path: "/unknown" }, { referrerHost: "https://example.com/private?token=secret" }, { referrerHost: "a".repeat(254) }, { createdAt: "2000-01-01" }, { userId: "member" }]) {
    assert.equal((await post(visit(overrides))).status, 400);
  }
  assert.equal(records.length, 0);
});

test("common bots are ignored and oversized request bodies are rejected", async () => {
  assert.equal((await post(visit(), "Googlebot")).status, 204);
  assert.equal(records.length, 0);
  assert.equal((await post(visit({ extra: "x".repeat(3000) }))).status, 413);
  assert.equal(records.length, 0);
});

test("missing configuration and database outages return bounded errors", async () => {
  delete process.env.JWT_SECRET;
  assert.equal((await post(visit())).status, 503);
  assert.equal(records.length, 0);
  process.env.JWT_SECRET = secret;
  failDatabase = true;
  const collection = await post(visit());
  assert.equal(collection.status, 503);
  assert.equal((await collection.json()).message, "Visit tracking is unavailable.");
  const report = await get();
  assert.equal(report.status, 500);
  assert.equal((await report.json()).message, "Unable to load site analytics.");
});

test("members and moderators without analytics access cannot read reports, including with forged token roles", async () => {
  assert.equal((await get("", null)).status, 401);
  for (role of ["client", "vendor", "planner", "moderator"]) assert.equal((await get()).status, 403);
  role = null;
  assert.equal((await get()).status, 401);
  assert.equal(aggregateCalls, 0);
});

test("moderator analytics access follows current database grants and can be revoked", async () => {
  role = "moderator";
  moderatorPermissions = ["users.read", "analytics.read"];
  assert.equal((await get()).status, 200);
  assert.equal(aggregateCalls, 1);
  moderatorPermissions = ["users.read"];
  assert.equal((await get()).status, 403);
  assert.equal(aggregateCalls, 1);
  role = "client";
  moderatorPermissions = ["analytics.read"];
  assert.equal((await get()).status, 403);
});

test("date windows respect Lagos midnight, leap days, and bounded recent history", () => {
  const now = new Date("2026-10-07T23:30:00Z"); // October 8 in Lagos.
  const range = parseRange({ days: "7" }, now);
  assert.equal(range.start, "2026-10-02");
  assert.equal(range.end, "2026-10-08");
  assert.equal(range.from.toISOString(), "2026-10-01T23:00:00.000Z");
  assert.equal(range.until.toISOString(), "2026-10-08T23:00:00.000Z");
  for (const days of [7, 30, 90]) assert.equal(parseRange({ days: String(days) }, now).days, days);
  assert.equal(parseRange({ start: "2024-02-29", end: "2024-03-01" }, new Date("2024-03-01T12:00Z")).days, 2);
  for (const query of [{ days: "365" }, { days: ["7", "30"] }, { start: "2026-02-30", end: "2026-10-08" }, { start: "2026-10-09", end: "2026-10-08" }, { start: "2026-10-08", end: "2026-10-09" }, { start: "2026-01-01", end: "2026-01-02" }, { start: "2026-10-08" }, { start: "2026-10-08", end: "2026-10-08", days: "7" }]) assert.equal(parseRange(query, now), null);
});

test("report queries reject invalid ranges before querying and emit a complete zero-filled timeline", async () => {
  assert.equal((await get("?days=365")).status, 400);
  assert.equal((await get("?start=bad&end=bad")).status, 400);
  assert.equal(aggregateCalls, 0);
  const response = await get("?days=30");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { data } = await response.json();
  assert.deepEqual(data.totals, { pageViews: 0, visitors: 0, visits: 0 });
  assert.equal(data.daily.length, 30);
  assert.equal(data.daily[0].date, data.range.start);
  assert.equal(data.daily.at(-1).date, data.range.end);
  assert.equal(data.range.timezone, "Africa/Lagos");
  assert.ok(data.daily.every((row) => row.pageViews === 0 && row.visitors === 0 && row.visits === 0));
  assert.deepEqual(lastPipeline[0].$match.createdAt, { $gte: new Date(`${data.range.start}T00:00:00+01:00`), $lt: new Date(new Date(`${data.range.end}T00:00:00+01:00`).getTime() + 86400000) });
});

test("period totals remain distinct from summed daily visitors and source counts use visits", () => {
  const range = parseRange({ start: "2026-10-01", end: "2026-10-03" }, new Date("2026-10-07T12:00Z"));
  const output = formatReport({ pageViews: [{ count: 8 }], visitors: [{ count: 2 }], visits: [{ count: 3 }], daily: [{ date: "2026-10-01", pageViews: 4, visitors: 2, visits: 2 }, { date: "2026-10-03", pageViews: 4, visitors: 2, visits: 1 }], pages: [{ path: "/", pageViews: 8, visitors: 2 }], referrers: [{ source: "google.com", visits: 2 }, { source: "", visits: 1 }] }, range);
  assert.deepEqual(output.totals, { pageViews: 8, visitors: 2, visits: 3 });
  assert.equal(output.daily.length, 3);
  assert.deepEqual(output.daily[1], { date: "2026-10-02", pageViews: 0, visitors: 0, visits: 0 });
  assert.equal(output.daily.reduce((sum, row) => sum + row.visitors, 0), 4);
  const facet = reportPipeline(range)[1].$facet;
  assert.equal(facet.daily[0].$group._id.$dateToString.timezone, "Africa/Lagos");
  assert.deepEqual(facet.referrers[1].$group, { _id: "$sessionKey", source: { $first: "$referrerHost" } });
});

test("visit records have a unique event index and 90-day automatic expiry", () => {
  const indexes = SiteVisit.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.eventId === 1 && options.unique));
  assert.ok(indexes.some(([keys, options]) => keys.createdAt === 1 && options.expireAfterSeconds === 90 * 86400));
});

test("the public collector rate limits excessive requests", async () => {
  let status;
  for (let index = 0; index < 245; index += 1) {
    status = (await post(visit(), "Googlebot")).status;
    if (status === 429) break;
  }
  assert.equal(status, 429);
  assert.equal(records.length, 0);
});
