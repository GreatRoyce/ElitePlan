require("./helpers/staffAuditStub").install();
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Announcement = require("../src/models/announcement.model");
const Receipt = require("../src/models/announcementReceipt.model");
const adminRoutes = require("../src/routes/admin.routes");
const routes = require("../src/routes/announcements.routes");
const service = require("../src/services/announcements.service");
const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa", CLIENT = "bbbbbbbbbbbbbbbbbbbbbbbb", VENDOR = "cccccccccccccccccccccccc", PLANNER = "dddddddddddddddddddddddd", MOD = "eeeeeeeeeeeeeeeeeeeeeeee", AID = "111111111111111111111111";
const secret = "announcement-test-secret", previousSecret = process.env.JWT_SECRET, originals = [];
let users, announcements, receipts, writes, conflict, failure, duplicateRace, server, base;
const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
const equal = (a, b) => a == null && b == null || String(a) === String(b);
function matches(r, f) {
  return Object.entries(f).every(([key, wanted]) => {
    if (key === "$or") return wanted.some((item) => matches(r, item));
    const value = r[key];
    if (wanted && typeof wanted === "object" && !Array.isArray(wanted) && !(wanted instanceof Date)) return Object.entries(wanted).every(([op, operand]) => {
      if (op === "$in") return (Array.isArray(value) ? value : [value]).some((v) => operand.some((o) => equal(v, o)));
      if (op === "$ne") return !equal(value, operand);
      if (op === "$lte") return value != null && new Date(value) <= new Date(operand);
      if (op === "$gt") return value != null && new Date(value) > new Date(operand);
      throw new Error(`Unsupported filter ${op}`);
    });
    return Array.isArray(value) ? value.some((v) => equal(v, wanted)) : equal(value, wanted);
  });
}
function query(get, model) {
  return { selection: "", offset: 0, size: Infinity, ordering: null, select(v) { this.selection = v; return this; }, sort(v) { this.ordering = v; return this; }, skip(v) { this.offset = v; return this; }, limit(v) { this.size = v; return this; },
    async exec() {
      if (failure && model === Announcement) throw new Error("Private DB credentials");
      let value = clone(await get());
      if (Array.isArray(value)) {
        if (this.ordering) value.sort((a, b) => { for (const [k, order] of Object.entries(this.ordering)) { const comparison = a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0; if (comparison) return comparison * order; } return 0; });
        value = value.slice(this.offset, this.offset + this.size);
      }
      if (model === Announcement) for (const a of Array.isArray(value) ? value : value ? [value] : []) for (const key of ["createdBy", "history", "requestId", "submissionHash"]) if (!this.selection.includes(`+${key}`)) delete a[key];
      return value;
    }, lean() { return this.exec(); }, then(resolve, reject) { return this.exec().then(resolve, reject); },
  };
}
function stub(m, key, fn) { originals.push([m, key, m[key]]); m[key] = fn; }
before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null));
  stub(Announcement, "findById", (id) => query(() => announcements.get(String(id)) || null, Announcement));
  stub(Announcement, "findOne", (f) => query(() => [...announcements.values()].find((a) => matches(a, f)) || null, Announcement));
  stub(Announcement, "find", (f) => query(() => [...announcements.values()].filter((a) => matches(a, f)), Announcement));
  stub(Announcement, "countDocuments", async (f) => { if (failure) throw new Error("Private DB credentials"); return [...announcements.values()].filter((a) => matches(a, f)).length; });
  stub(Announcement, "create", async (body) => {
    const doc = new Announcement(body); assert.equal(doc.validateSync(), undefined); const a = clone(doc.toObject()); announcements.set(String(a._id), a); writes.push(clone({ create: a }));
    if (duplicateRace) throw Object.assign(new Error("Duplicate key"), { code: 11000 });
    return doc;
  });
  stub(Announcement, "findOneAndUpdate", (f, update, options) => query(() => {
    const a = [...announcements.values()].find((value) => matches(value, f)); if (!a || conflict) return null;
    assert.equal(options.new, true); assert.equal(options.runValidators, true); assert.equal(update.$push.history.$slice, -100);
    Object.assign(a, clone(update.$set)); for (const [k, v] of Object.entries(update.$inc)) a[k] = (a[k] || 0) + v;
    a.history = [...(a.history || []), ...clone(update.$push.history.$each)].slice(-100); assert.equal(new Announcement(a).validateSync(), undefined); writes.push(clone({ f, update })); return a;
  }, Announcement));
  stub(Receipt, "find", (f) => query(() => receipts.filter((r) => matches(r, f))));
  stub(Receipt, "updateOne", async (f, update, options) => { assert.equal(options.upsert, true); assert.equal(options.runValidators, true); if (!receipts.some((r) => matches(r, f))) { const r = clone(update.$setOnInsert); assert.equal(new Receipt(r).validateSync(), undefined); receipts.push(r); } return { acknowledged: true }; });
  const app = express(); app.use(express.json()); app.use("/admin", adminRoutes); app.use("/announcements", routes);
  server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  users = new Map([[ADMIN, { _id: ADMIN, role: "admin" }], [CLIENT, { _id: CLIENT, role: "client" }], [VENDOR, { _id: VENDOR, role: "vendor" }], [PLANNER, { _id: PLANNER, role: "planner" }], [MOD, { _id: MOD, role: "moderator", moderatorPermissions: ["content.manage", "reports.manage"] }]]);
  announcements = new Map([[AID, { _id: AID, title: "Service update", body: "Please review the current service update.", audiences: ["client"], important: false, status: "draft", startsAt: null, endsAt: null, version: 0, publicationVersion: 0, createdBy: ADMIN, requestId: randomUUID(), submissionHash: "original", history: [] }]]);
  receipts = []; writes = []; conflict = false; failure = false; duplicateRace = false;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [m, key, original] of originals) m[key] = original; if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
const token = (id = ADMIN, extra = {}) => jwt.sign({ id, role: "admin", authVersion: 0, ...extra }, secret);
async function request(route, { id = ADMIN, auth = token(id), body, method } = {}) {
  const r = await fetch(`${base}${route}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, data: await r.json(), headers: r.headers };
}
const payload = (extra = {}) => ({ title: "New site notice", body: "A helpful announcement for site members.", audiences: ["client", "vendor", "planner"], important: false, startsAt: null, endsAt: null, note: "Private publishing reason", ...extra });
const action = (name, extra = {}) => request(`/admin/announcements/${AID}/actions`, { body: { action: name, expectedVersion: announcements.get(AID).version, note: "Private publishing reason", ...extra } });
const feed = (id = CLIENT) => request("/announcements/mine", { id });
const publicFeed = () => request("/announcements/public", { auth: null });
const acknowledge = (id = CLIENT, version = announcements.get(AID).publicationVersion, extra = {}) => request(`/announcements/${AID}/acknowledge`, { id, body: { publicationVersion: version, ...extra } });

test("all announcement administration requires a current admin role", async () => {
  for (const id of [CLIENT, VENDOR, PLANNER, MOD]) {
    for (const route of ["/admin/announcements", `/admin/announcements/${AID}`]) assert.equal((await request(route, { id })).status, 403);
    assert.equal((await request("/admin/announcements", { id, body: payload({ requestId: randomUUID() }) })).status, 403);
    assert.equal((await request(`/admin/announcements/${AID}`, { id, method: "PATCH", body: payload({ expectedVersion: 0 }) })).status, 403);
    assert.equal((await request(`/admin/announcements/${AID}/actions`, { id, body: { action: "publish", expectedVersion: 0, note: "Fake" } })).status, 403);
  }
  users.get(ADMIN).authVersion = 1; assert.equal((await action("publish")).status, 401); assert.equal(writes.length, 0);
});
test("draft creation is unpublished, allowlisted and safely idempotent even after edits", async () => {
  const body = payload({ requestId: randomUUID() }); const created = await request("/admin/announcements", { body }); assert.equal(created.status, 201); assert.equal(created.data.data.state, "draft"); const id = String(created.data.data._id);
  assert.equal((await request(`/admin/announcements/${id}`, { method: "PATCH", body: payload({ title: "Edited later", expectedVersion: 0 }) })).status, 200);
  assert.equal((await request("/admin/announcements", { body })).status, 200); assert.equal(writes.filter((w) => w.create).length, 1);
  assert.equal((await request("/admin/announcements", { body: { ...body, body: "A different announcement." } })).status, 409);
  assert.equal((await publicFeed()).data.data.pagination.total, 0); assert.equal((await feed()).data.data.pagination.total, 0);
  for (const extra of [{ status: "published" }, { createdBy: CLIENT }, { publicationVersion: 2 }, { audiences: ["admin"] }, { audiences: ["client", "client"] }, { audiences: [] }, { important: "true" }, { title: "x" }, { note: "" }]) assert.equal((await request("/admin/announcements", { body: payload({ requestId: randomUUID(), ...extra }) })).status, 400);
});
test("duplicate-key creation races return the already saved draft", async () => {
  duplicateRace = true; const r = await request("/admin/announcements", { body: payload({ requestId: randomUUID() }) }); assert.equal(r.status, 200); assert.equal(writes.length, 1);
});
test("member audiences use database roles and public notices are the only guest content", async () => {
  await action("publish"); assert.equal((await feed(CLIENT)).data.data.pagination.total, 1); assert.equal((await feed(VENDOR)).data.data.pagination.total, 0); assert.equal((await feed(PLANNER)).data.data.pagination.total, 0); assert.equal((await publicFeed()).data.data.pagination.total, 0);
  announcements.get(AID).audiences = ["vendor", "planner"]; assert.equal((await feed(CLIENT)).data.data.pagination.total, 0); assert.equal((await feed(VENDOR)).data.data.pagination.total, 1); assert.equal((await feed(PLANNER)).data.data.pagination.total, 1);
  announcements.get(AID).audiences = ["public"]; assert.equal((await publicFeed()).data.data.pagination.total, 1); for (const id of [CLIENT, VENDOR, PLANNER]) assert.equal((await feed(id)).data.data.pagination.total, 1);
  const r = await publicFeed(); assert.equal(r.headers.get("cache-control"), "no-store"); assert.doesNotMatch(JSON.stringify(r.data), /Private publishing reason|history|createdBy|requestId|submissionHash|audiences|"version"/);
});
test("member feeds reject anonymous, staff, restricted, support-only and stale sessions", async () => {
  assert.equal((await request("/announcements/mine", { auth: null })).status, 401);
  for (const id of [ADMIN, MOD]) assert.equal((await feed(id)).status, 403);
  assert.equal((await request("/announcements/mine", { auth: token(CLIENT, { purpose: "support" }) })).status, 401);
  users.get(CLIENT).accountStatus = "banned"; assert.equal((await feed()).status, 403); users.get(CLIENT).accountStatus = "active"; users.get(CLIENT).authVersion = 1; assert.equal((await feed()).status, 401);
});
test("scheduled and expired notices enforce start-inclusive and end-exclusive boundaries", async () => {
  const now = new Date("2026-10-08T12:00:00.000Z"); const a = announcements.get(AID); Object.assign(a, { status: "published", startsAt: now.toISOString(), endsAt: "2026-10-08T13:00:00.000Z" });
  assert.equal(service.state(a, now), "live"); assert.equal(matches(a, service.liveFilter(now, "client")), true);
  assert.equal(matches(a, service.liveFilter(new Date(now.getTime() - 1), "client")), false);
  assert.equal(matches(a, service.liveFilter(new Date(a.endsAt), "client")), false); assert.equal(service.state(a, new Date(a.endsAt)), "expired");
  a.startsAt = new Date(Date.now() + 3600000).toISOString(); a.endsAt = null; const r = await action("withdraw"); assert.equal(r.status, 200); assert.equal((await action("publish")).data.data.state, "scheduled"); assert.equal((await feed()).data.data.pagination.total, 0);
  a.startsAt = new Date(Date.now() - 3600000).toISOString(); assert.equal((await feed()).data.data.pagination.total, 1); a.endsAt = new Date(Date.now() - 1000).toISOString(); assert.equal((await feed()).data.data.pagination.total, 0);
});
test("bad dates, overflow, naive timezones and reversed schedules are rejected", async () => {
  for (const extra of [{ startsAt: "2026-02-30T10:00:00Z" }, { startsAt: "2026-10-08T24:00:00Z" }, { startsAt: "2026-10-08T12:00" }, { startsAt: "not a date" }, { startsAt: "2101-01-01T10:00:00Z" }, { startsAt: "2026-10-09T12:00:00Z", endsAt: "2026-10-08T12:00:00Z" }]) assert.equal((await request("/admin/announcements", { body: payload({ requestId: randomUUID(), ...extra }) })).status, 400);
  announcements.get(AID).endsAt = new Date(Date.now() - 1000).toISOString(); assert.equal((await action("publish")).status, 409);
});
test("published announcements require withdrawal before content changes or archiving", async () => {
  assert.equal((await action("publish")).data.data.state, "live"); assert.equal((await request(`/admin/announcements/${AID}`, { method: "PATCH", body: payload({ expectedVersion: 1 }) })).status, 409); assert.equal((await action("archive")).status, 409);
  assert.equal((await action("withdraw")).status, 200); assert.equal((await feed()).data.data.pagination.total, 0);
  assert.equal((await request(`/admin/announcements/${AID}`, { method: "PATCH", body: payload({ expectedVersion: 2 }) })).status, 200);
  assert.equal((await action("archive")).data.data.state, "archived"); assert.equal((await action("publish")).status, 409);
});
test("member acknowledgements are private, idempotent and reset on republication", async () => {
  announcements.get(AID).audiences = ["public"]; await action("publish"); assert.equal((await acknowledge()).status, 200); assert.equal((await acknowledge()).status, 200); assert.equal(receipts.length, 1);
  assert.ok((await feed()).data.data.announcements[0].acknowledgedAt); assert.equal((await feed(VENDOR)).data.data.announcements[0].acknowledgedAt, null); assert.doesNotMatch(JSON.stringify((await publicFeed()).data), /acknowledgedAt|user/);
  await action("withdraw"); await action("publish"); assert.equal((await feed()).data.data.announcements[0].acknowledgedAt, null); assert.equal((await acknowledge(CLIENT, 1)).status, 404); assert.equal((await acknowledge()).status, 200); assert.equal(receipts.length, 2);
});
test("members cannot acknowledge drafts, non-targeted, withdrawn or stale notices or inject owners", async () => {
  assert.equal((await acknowledge(CLIENT, 1)).status, 404); await action("publish"); assert.equal((await acknowledge(VENDOR)).status, 404);
  assert.equal((await acknowledge(CLIENT, 1, { user: VENDOR })).status, 400); assert.equal((await acknowledge(CLIENT, 0)).status, 400); await action("withdraw"); assert.equal((await acknowledge()).status, 404); assert.equal(receipts.length, 0);
});
test("conditional revision checks reject concurrent writes and retain bounded admin history", async () => {
  assert.equal((await action("publish", { expectedVersion: 4 })).status, 409); conflict = true; assert.equal((await action("publish")).status, 409); conflict = false;
  const a = announcements.get(AID); a.history = Array.from({ length: 100 }, () => ({ _id: String(new mongoose.Types.ObjectId()), action: "update", by: ADMIN, note: "Old review", at: new Date() }));
  const r = await action("publish"); assert.equal(r.status, 200); assert.equal(a.history.length, 100); assert.equal(r.data.data.history[0].action, "publish"); assert.equal(writes.length, 1);
});
test("strict feed filters prevent audience overrides and admin states filter records correctly", async () => {
  for (const q of ["audience=vendor", "state=draft", "page=0", "pageSize=51", "page=1.5", "page[]=1"]) assert.equal((await request(`/announcements/public?${q}`, { auth: null })).status, 400);
  assert.equal((await request("/admin/announcements?state=draft")).data.data.pagination.total, 1); await action("publish"); assert.equal((await request("/admin/announcements?state=live&audience=client")).data.data.pagination.total, 1); assert.equal((await request("/admin/announcements?state=draft")).data.data.pagination.total, 0);
  assert.equal((await request("/admin/announcements?audience=vendor")).data.data.pagination.total, 0); assert.equal((await request("/admin/announcements?state=bogus")).status, 400); assert.equal((await request("/announcements/public?page=999", { auth: null })).data.data.pagination.page, 1);
});
test("important notices sort first; pagination returns bounded content", async () => {
  await action("publish"); const second = { ...clone(announcements.get(AID)), _id: "222222222222222222222222", important: true, title: "Urgent notice" }; announcements.set(second._id, second);
  const r = await request("/announcements/mine?pageSize=1", { id: CLIENT }); assert.equal(r.data.data.announcements.length, 1); assert.equal(r.data.data.announcements[0].title, "Urgent notice"); assert.equal(r.data.data.pagination.totalPages, 2);
});
test("invalid actions and missing records fail without mutations; DB errors stay private", async () => {
  for (const extra of [{ action: "delete" }, { note: "" }, { expectedVersion: -1 }, { audiences: ["public"] }]) assert.equal((await action("publish", extra)).status, 400);
  assert.equal((await request("/admin/announcements/not-valid")).status, 400); assert.equal((await request("/admin/announcements/999999999999999999999999")).status, 404);
  failure = true; const r = await publicFeed(); assert.equal(r.status, 500); assert.doesNotMatch(JSON.stringify(r.data), /Private DB|credentials/); assert.equal(writes.length, 0);
});
