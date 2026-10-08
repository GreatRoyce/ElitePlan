const audit = require("./helpers/staffAuditStub").install();
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Advert = require("../src/models/advert.model");
const routes = require("../src/routes/adverts.routes");
const adminRoutes = require("../src/routes/admin.routes");
const s = require("../src/services/adverts.service");
const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa", CLIENT = "bbbbbbbbbbbbbbbbbbbbbbbb", VENDOR = "cccccccccccccccccccccccc", PLANNER = "dddddddddddddddddddddddd", MOD = "eeeeeeeeeeeeeeeeeeeeeeee", AID = "111111111111111111111111";
const secret = "advert-test-secret", oldSecret = process.env.JWT_SECRET, originals = [];
const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
const equal = (a, b) => a == null && b == null || String(a) === String(b);
let users, adverts, writes, conflict, failure, duplicateRace, server, base;
function matches(row, filter) {
  return Object.entries(filter).every(([key, wanted]) => {
    if (key === "$or") return wanted.some((item) => matches(row, item));
    const value = row[key];
    if (wanted && typeof wanted === "object" && !Array.isArray(wanted) && !(wanted instanceof Date) && typeof wanted.toHexString !== "function") return Object.entries(wanted).every(([op, operand]) => {
      if (op === "$in") return (Array.isArray(value) ? value : [value]).some((v) => operand.some((w) => equal(v, w)));
      if (op === "$ne") return !equal(value, operand);
      if (op === "$lte") return value != null && new Date(value) <= new Date(operand);
      if (op === "$gt") return value != null && new Date(value) > new Date(operand);
      throw new Error(`Unsupported filter ${op}`);
    });
    return Array.isArray(value) ? value.some((v) => equal(v, wanted)) : equal(value, wanted);
  });
}
function query(get, guarded = true) {
  return { offset: 0, size: Infinity, ordering: null, select() { return this; }, sort(order) { this.ordering = order; return this; }, skip(n) { this.offset = n; return this; }, limit(n) { this.size = n; return this; }, async exec() {
    if (guarded && failure) throw new Error("Private DB credentials");
    let rows = clone(await get());
    if (Array.isArray(rows)) { if (this.ordering) rows.sort((a, b) => { for (const [key, direction] of Object.entries(this.ordering)) { const comparison = a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0; if (comparison) return comparison * direction; } return 0; }); rows = rows.slice(this.offset, this.offset + this.size); }
    return rows;
  }, lean() { return this.exec(); }, then(resolve, reject) { return this.exec().then(resolve, reject); } };
}
function stub(m, method, impl) { originals.push([m, method, m[method]]); m[method] = impl; }
before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null, false));
  stub(Advert, "findById", (id) => query(() => adverts.get(String(id)) || null));
  stub(Advert, "findOne", (filter) => query(() => [...adverts.values()].find((a) => matches(a, filter)) || null));
  stub(Advert, "find", (filter) => query(() => [...adverts.values()].filter((a) => matches(a, filter))));
  stub(Advert, "countDocuments", async (filter) => { if (failure) throw new Error("Private DB credentials"); return [...adverts.values()].filter((a) => matches(a, filter)).length; });
  stub(Advert, "create", async (body) => {
    if (failure) throw new Error("Private DB credentials"); const a = new Advert(body); assert.equal(a.validateSync(), undefined); adverts.set(String(a._id), clone(a.toObject())); writes.push({ create: true });
    if (duplicateRace) { const e = new Error("duplicate"); e.code = 11000; throw e; } return a;
  });
  stub(Advert, "findOneAndUpdate", (filter, update, options) => query(() => {
    const a = [...adverts.values()].find((r) => matches(r, filter)); if (!a || conflict) return null;
    assert.equal(options.new, true); assert.equal(options.runValidators, true); Object.assign(a, clone(update.$set));
    for (const [key, inc] of Object.entries(update.$inc)) a[key] += inc;
    a.history = [...a.history, ...clone(update.$push.history.$each).map((h) => ({ _id: String(new mongoose.Types.ObjectId()), ...h }))].slice(-100);
    assert.equal(new Advert(a).validateSync(), undefined); writes.push(clone(update)); return a;
  }));
  const app = express(); app.use(express.json()); app.use("/admin", adminRoutes); app.use("/adverts", routes);
  server = await new Promise((resolve) => { const t = app.listen(0, "127.0.0.1", () => resolve(t)); }); base = `http://127.0.0.1:${server.address().port}`;
});
const payload = (extra = {}) => ({ sponsor: "Event Partner", title: "Book your event venue", body: "Explore spaces for your next event.", destinationUrl: "https://partner.example.com/venues", ctaLabel: "See venues", imageUrl: "", imageAlt: "", placements: ["home", "dashboard"], audiences: ["public"], startsAt: null, endsAt: null, note: "Private campaign review", ...extra });
beforeEach(() => {
  users = new Map([[ADMIN, { _id: ADMIN, username: "Admin", role: "admin" }], [CLIENT, { _id: CLIENT, username: "Client", role: "client" }], [VENDOR, { _id: VENDOR, role: "vendor" }], [PLANNER, { _id: PLANNER, role: "planner" }], [MOD, { _id: MOD, role: "moderator", moderatorPermissions: ["content.manage", "content.read"] }]]);
  const body = payload(); const { note, ...content } = body;
  adverts = new Map([[AID, { _id: AID, ...content, status: "draft", version: 0, publicationVersion: 0, publishedAt: null, createdAt: "2026-01-01T12:00:00Z", createdBy: ADMIN, requestId: randomUUID(), submissionHash: s.hash(s.content(body)), history: [{ _id: String(new mongoose.Types.ObjectId()), action: "create", by: ADMIN, note, at: new Date() }] }]]);
  writes = []; conflict = false; failure = false; duplicateRace = false;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [m, method, original] of originals) m[method] = original; if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
const token = (id = ADMIN, extra = {}) => jwt.sign({ id, role: "admin", authVersion: 0, ...extra }, secret);
async function request(path, { id = ADMIN, auth = token(id), method, body } = {}) {
  const r = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, data: await r.json(), headers: r.headers };
}
const action = (action, extra = {}, options = {}) => request(`/admin/adverts/${AID}/actions`, { body: { action, expectedVersion: adverts.get(AID).version, note: "Private campaign review", ...extra }, ...options });
const feed = (id = CLIENT, placement = "dashboard") => request(`/adverts/mine?placement=${placement}`, { id });
const publicFeed = () => request("/adverts/public?placement=home", { auth: null });

test("only current admins can manage adverts, including when token claims forge roles", async () => {
  for (const id of [CLIENT, VENDOR, PLANNER, MOD]) {
    for (const path of ["/admin/adverts", `/admin/adverts/${AID}`]) assert.equal((await request(path, { id })).status, 403);
    assert.equal((await request("/admin/adverts", { id, body: payload({ requestId: randomUUID() }) })).status, 403);
    assert.equal((await request(`/admin/adverts/${AID}`, { id, method: "PATCH", body: payload({ expectedVersion: 0 }) })).status, 403);
    assert.equal((await action("publish", {}, { id })).status, 403);
  }
  for (const auth of [null, "invalid", token(ADMIN, { purpose: "support" }), token(ADMIN, { exp: 1 })]) assert.equal((await action("publish", {}, { auth })).status, 401);
  users.get(ADMIN).authVersion = 1; assert.equal((await action("publish")).status, 401); assert.equal(writes.length, 0);
  assert.ok([...audit.entries.values()].every((e) => e.actorRole === "moderator" && e.outcome === "denied"));
});

test("drafts are unpublished, validated, allowlisted, idempotent and linked to the central audit", async () => {
  const body = payload({ requestId: randomUUID() }), r = await request("/admin/adverts", { body }); assert.equal(r.status, 201); const id = r.data.data._id; assert.equal(r.data.data.status, "draft");
  assert.equal((await request(`/admin/adverts/${id}`, { method: "PATCH", body: payload({ expectedVersion: 0, title: "Updated headline" }) })).status, 200);
  assert.equal((await request("/admin/adverts", { body })).status, 200); assert.equal(writes.filter((w) => w.create).length, 1);
  assert.equal((await request("/admin/adverts", { body: { ...body, sponsor: "Someone else" } })).status, 409);
  assert.equal((await publicFeed()).data.data.adverts.length, 0); assert.equal((await feed()).data.data.adverts.length, 0);
  const e = [...audit.entries.values()][0]; assert.equal(e.targetKind, "advert"); assert.equal(e.targetId, id); assert.equal(e.outcome, "succeeded");
  assert.equal((await request(`/admin/audit/${e._id}`)).data.data.targetLink, `/admin/adverts/${id}`);
});

test("duplicate-key races resolve to the already saved draft", async () => {
  duplicateRace = true; const r = await request("/admin/adverts", { body: payload({ requestId: randomUUID() }) }); assert.equal(r.status, 200); assert.equal(writes.length, 1);
});

test("mass assignment and invalid placements, audiences, content or image descriptions cannot save", async () => {
  for (const extra of [{ status: "published" }, { createdBy: CLIENT }, { version: 88 }, { history: [] }, { sponsor: "x" }, { title: "x" }, { ctaLabel: "x" }, { body: [] }, { body: "x".repeat(701) }, { placements: [] }, { placements: ["popup"] }, { placements: ["home", "home"] }, { audiences: ["admin"] }, { audiences: [] }, { imageUrl: "https://images.example.com/banner.jpg", imageAlt: "" }, { note: "" }, { note: "x".repeat(1001) }]) assert.equal((await request("/admin/adverts", { body: payload({ requestId: randomUUID(), ...extra }) })).status, 400);
  assert.equal(writes.length, 0);
});

test("destination and image URL validation rejects executable and disguised schemes", async () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hello", "http://example.com", "//evil.example.com", "/\\evil.example.com", "https://name:password@example.com", "https://example.com/a\nb", " https://example.com", "ftp://example.com", "", "https://example.com/\u0001"]) {
    assert.equal((await request("/admin/adverts", { body: payload({ requestId: randomUUID(), destinationUrl: url }) })).status, 400);
    if (url) assert.equal((await request("/admin/adverts", { body: payload({ requestId: randomUUID(), imageUrl: url, imageAlt: "A venue" }) })).status, 400);
  }
  assert.equal((await request("/admin/adverts", { body: payload({ requestId: randomUUID(), destinationUrl: "/announcements", imageUrl: "/uploads/venue.jpg", imageAlt: "A venue" }) })).status, 201);
  assert.equal((await request("/admin/adverts", { body: payload({ requestId: randomUUID(), imageUrl: "/admin/settings", imageAlt: "Image" }) })).status, 400);
});

test("audiences come from current member roles and guests receive only public home adverts", async () => {
  adverts.get(AID).audiences = ["vendor"]; await action("publish"); assert.equal((await feed(VENDOR)).data.data.adverts.length, 1); assert.equal((await feed(CLIENT)).data.data.adverts.length, 0); assert.equal((await feed(PLANNER)).data.data.adverts.length, 0); assert.equal((await publicFeed()).data.data.adverts.length, 0);
  adverts.get(AID).audiences = ["public"]; assert.equal((await publicFeed()).data.data.adverts.length, 1); for (const id of [CLIENT, VENDOR, PLANNER]) assert.equal((await feed(id)).data.data.adverts.length, 1);
  const r = await publicFeed(); assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(r.data.data.rotationSeconds, 15); assert.doesNotMatch(JSON.stringify(r.data), /Private campaign review|history|createdBy|requestId|submissionHash|audiences|placements|"version"/);
});

test("placement filtering cannot be overridden by query audience, state or arbitrary pagination", async () => {
  adverts.get(AID).placements = ["home"]; await action("publish"); assert.equal((await feed()).data.data.adverts.length, 0); assert.equal((await feed(CLIENT, "home")).data.data.adverts.length, 1);
  for (const q of ["placement=home&audience=vendor", "placement=home&state=draft", "placement[]=home", "placement=popup", "", "placement=home&pageSize=100", "placement=home&role=admin"]) assert.equal((await request(`/adverts/public?${q}`, { auth: null })).status, 400);
  assert.equal((await request("/adverts/public?placement=dashboard", { auth: null })).status, 400);
});

test("member feeds reject anonymous, staff, restricted and support-only or stale sessions", async () => {
  assert.equal((await request("/adverts/mine?placement=dashboard", { auth: null })).status, 401);
  for (const id of [ADMIN, MOD]) assert.equal((await feed(id)).status, 403);
  assert.equal((await request("/adverts/mine?placement=dashboard", { auth: token(CLIENT, { purpose: "support" }) })).status, 401);
  users.get(CLIENT).accountStatus = "banned"; assert.equal((await feed()).status, 403); users.get(CLIENT).accountStatus = "active"; users.get(CLIENT).authVersion = 1; assert.equal((await feed()).status, 401);
});

test("scheduled adverts obey inclusive start and exclusive expiry boundaries", async () => {
  const a = adverts.get(AID), now = new Date("2026-10-08T12:00:00Z"); Object.assign(a, { status: "published", startsAt: now.toISOString(), endsAt: "2026-10-08T13:00:00Z" });
  assert.equal(matches(a, s.liveFilter(now, "client", "home")), true); assert.equal(matches(a, s.liveFilter(new Date(now.getTime() - 1), "client", "home")), false); assert.equal(matches(a, s.liveFilter(new Date(a.endsAt), "client", "home")), false); assert.equal(s.state(a, new Date(a.endsAt)), "expired");
  a.status = "draft"; a.startsAt = new Date(Date.now() + 3600000).toISOString(); a.endsAt = null; assert.equal((await action("publish")).data.data.state, "scheduled"); assert.equal((await publicFeed()).data.data.adverts.length, 0);
  a.startsAt = new Date(Date.now() - 1000).toISOString(); assert.equal((await publicFeed()).data.data.adverts.length, 1); a.endsAt = new Date(Date.now() - 1).toISOString(); assert.equal((await publicFeed()).data.data.adverts.length, 0);
});

test("invalid and reversed dates or expired campaigns cannot publish", async () => {
  for (const extra of [{ startsAt: "2026-02-30T10:00:00Z" }, { startsAt: "2026-10-08T24:00:00Z" }, { startsAt: "2026-10-08T12:00" }, { startsAt: "garbage" }, { startsAt: "2026-10-09T12:00:00Z", endsAt: "2026-10-08T12:00:00Z" }]) assert.equal((await request("/admin/adverts", { body: payload({ requestId: randomUUID(), ...extra }) })).status, 400);
  adverts.get(AID).endsAt = new Date(Date.now() - 1).toISOString(); assert.equal((await action("publish")).status, 409); assert.equal(writes.length, 0);
});

test("live adverts require withdrawal before edits; withdrawal and archival stop delivery", async () => {
  await action("publish"); assert.equal((await request(`/admin/adverts/${AID}`, { method: "PATCH", body: payload({ expectedVersion: 1 }) })).status, 409); assert.equal((await action("archive")).status, 409);
  assert.equal((await action("withdraw")).status, 200); assert.equal((await publicFeed()).data.data.adverts.length, 0);
  assert.equal((await request(`/admin/adverts/${AID}`, { method: "PATCH", body: payload({ expectedVersion: 2, title: "New venue campaign" }) })).status, 200); assert.equal((await action("publish")).status, 200); assert.equal(adverts.get(AID).publicationVersion, 2);
  await action("withdraw"); assert.equal((await action("archive")).status, 200); assert.equal((await action("publish")).status, 409);
});

test("conditional versions, bounded recent history and central request outcomes protect edits", async () => {
  assert.equal((await action("publish", { expectedVersion: 2 })).status, 409); conflict = true; assert.equal((await action("publish")).status, 409); conflict = false;
  const a = adverts.get(AID); a.history = Array.from({ length: 100 }, () => ({ action: "update", by: ADMIN, note: "Older review", at: new Date() })); await action("publish"); assert.equal(a.history.length, 100); assert.equal(a.version, 1); assert.equal([...audit.entries.values()].at(-1).resultState, "published");
});

test("admin filters and pagination work while live rotations have a bounded 50-ad feed", async () => {
  assert.equal((await request("/admin/adverts?state=draft&placement=home&audience=public")).data.data.pagination.total, 1); await action("publish"); assert.equal((await request("/admin/adverts?state=live&placement=dashboard")).data.data.pagination.total, 1);
  for (const q of ["placement[]=home", "placement=invalid", "state=invalid", "page=0", "pageSize=51", "page=1.5"]) assert.equal((await request(`/admin/adverts?${q}`)).status, 400);
  const a = adverts.get(AID); for (let i = 0; i < 60; i++) { const id = String(new mongoose.Types.ObjectId()); adverts.set(id, { ...clone(a), _id: id }); }
  assert.equal((await publicFeed()).data.data.adverts.length, 50); const paged = await request("/admin/adverts?page=999&pageSize=20"); assert.equal(paged.data.data.pagination.page, 4); assert.equal(paged.data.data.adverts.length, 1);
});

test("audit reservation failure stops publication; completion failure keeps its warning and live result", async () => {
  audit.failCreate = true; assert.equal((await action("publish")).status, 503); assert.equal(writes.length, 0);
  audit.failCreate = false; audit.failFinish = true; const r = await action("publish"); assert.equal(r.status, 200); assert.equal(r.headers.get("x-staff-audit-status"), "pending"); assert.match(r.data.auditWarning, /unconfirmed/); assert.equal(adverts.get(AID).status, "published");
});

test("missing records, unsupported actions and read/write failures disclose no database details", async () => {
  assert.equal((await request("/admin/adverts/not-an-id")).status, 400); assert.equal((await request("/admin/adverts/999999999999999999999999")).status, 404);
  for (const extra of [{ action: "delete" }, { expectedVersion: -1 }, { note: "" }, { audiences: ["public"] }]) assert.equal((await action("publish", extra)).status, 400);
  failure = true; for (const r of [await publicFeed(), await action("publish"), await request("/admin/adverts")]) { assert.equal(r.status, 503); assert.doesNotMatch(JSON.stringify(r.data), /Private DB|credentials/); } assert.equal(writes.length, 0);
});
