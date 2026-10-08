require("./helpers/staffAuditStub").install();
require("./helpers/platformSettingsStub").install();
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Consultation = require("../src/models/initialConsultation.model");
const Event = require("../src/models/event.model");
const Board = require("../src/models/dashboards/plannerdashboard.model");
const Planner = require("../src/models/plannerProfile.model");
const Vendor = require("../src/models/vendorProfile.model");
const Client = require("../src/models/clientProfile.model");
const Notification = require("../src/models/notification.model");
const Message = require("../src/models/message.model");
const service = require("../src/services/oversight.service");
const adminRoutes = require("../src/routes/admin.routes");
const consultationRoutes = require("../src/routes/initialConsultation.routes");
const eventRoutes = require("../src/routes/events.routes");
const plannerRoutes = require("../src/routes/dashboards/plannerdashboard.routes");

const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa", MEMBER = "bbbbbbbbbbbbbbbbbbbbbbbb", PROFESSIONAL = "cccccccccccccccccccccccc", OTHER = "dddddddddddddddddddddddd", MOD = "eeeeeeeeeeeeeeeeeeeeeeee";
const CID = "111111111111111111111111", EID = "222222222222222222222222", BID = "333333333333333333333333", BEID = "444444444444444444444444", PP = "555555555555555555555555", CP = "666666666666666666666666", VP = "777777777777777777777777";
const secret = "operations-test-secret", oldSecret = process.env.JWT_SECRET;
const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
let users, records, profileMaps, writes, notices, messages, conflict, race, failDatabase, failNotices, server, base;
const originals = [];
function stub(model, method, impl) { originals.push([model, method, model[method]]); model[method] = impl; }
function field(value, key) { return key.split(".").reduce((v, part) => Array.isArray(v) ? v.flatMap((item) => item?.[part] ?? []) : v?.[part], value); }
const same = (a, b) => a == null && b == null || String(a) === String(b);
function matches(value, filter) {
  return Object.entries(filter).every(([key, wanted]) => {
    if (key === "$or") return wanted.some((f) => matches(value, f));
    const actual = field(value, key);
    if (wanted && typeof wanted === "object" && !Array.isArray(wanted)) {
      if (wanted.$elemMatch) return actual?.some((v) => matches(v, wanted.$elemMatch));
      if (Object.hasOwn(wanted, "$exists")) return (actual !== undefined) === wanted.$exists;
      if (Object.hasOwn(wanted, "$ne")) return !same(actual, wanted.$ne);
      if (wanted.$in) return (Array.isArray(actual) ? actual : [actual]).some((v) => wanted.$in.some((w) => same(v, w)));
      if (wanted.$regex !== undefined) return new RegExp(wanted.$regex, wanted.$options).test(actual || "");
      if (wanted.$gte || wanted.$lt) return (!wanted.$gte || new Date(actual) >= new Date(wanted.$gte)) && (!wanted.$lt || new Date(actual) < new Date(wanted.$lt));
    }
    return Array.isArray(actual) ? actual.some((v) => same(v, wanted)) : same(actual, wanted);
  });
}
function query(get, Model, guarded = true) {
  return {
    select() { return this; }, sort() { return this; }, populate(path) { (this.populates ||= []).push(path); return this; },
    lean() { this.plain = true; return this.exec(); },
    async exec() {
      if (guarded && failDatabase) throw new Error("Private database credentials");
      let value = clone(await get());
      if (this.populates && Model === Consultation) for (const r of Array.isArray(value) ? value : value ? [value] : []) {
        if (this.populates.includes("client")) r.client = clone(users.get(r.user));
        if (this.populates.includes("receiver")) r.receiver = clone(users.get(r.targetUser));
        if (this.populates.includes("user")) r.user = clone(users.get(r.user)) || r.user;
      }
      if (Model === Board && !this.plain && value) return new Board(value);
      return value;
    }, then(resolve, reject) { return this.exec().then(resolve, reject); },
  };
}
function expression(value, expr, key) {
  if (expr === 1) return value[key];
  if (typeof expr === "string" && expr.startsWith("$")) return field(value, expr.slice(1));
  if (expr?.$toLower) return String(expression(value, expr.$toLower)).toLowerCase();
  throw new Error(`Unexpected projection ${key}`);
}
function applyWrite(record, update) {
  Object.assign(record, clone(update.$set || {}));
  for (const [key, inc] of Object.entries(update.$inc || {})) record[key] = (record[key] || 0) + inc;
  for (const [key, change] of Object.entries(update.$push || {})) { assert.equal(change.$slice, -100); record[key] = [...(record[key] || []), ...clone(change.$each)].slice(-100); }
}
before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null, undefined, false));
  for (const [type, Model] of Object.entries(service.models)) {
    stub(Model, "findById", (id) => query(() => records[type].get(String(id)) || null, Model));
    stub(Model, "findOne", (filter) => query(() => [...records[type].values()].find((r) => matches(r, filter)) || null, Model));
    stub(Model, "find", (filter = {}) => query(() => [...records[type].values()].filter((r) => matches(r, filter)), Model));
    stub(Model, "findOneAndDelete", (filter) => query(() => {
      const r = [...records[type].values()].find((r) => matches(r, filter)); if (!r || conflict) return null;
      if (race) { r.oversightVersion = (r.oversightVersion || 0) + 1; return null; }
      records[type].delete(String(r._id)); writes.push({ deleted: true, type, filter }); return r;
    }, Model));
    stub(Model, "findOneAndUpdate", (filter, update, options) => query(() => {
      const r = [...records[type].values()].find((r) => matches(r, filter));
      if (!r || conflict) return null;
      const target = type === "planner-events" ? r.events.find((e) => matches(e, filter.events.$elemMatch)) : r;
      if (race) { target.oversightVersion = (target.oversightVersion || 0) + 1; return null; }
      assert.equal(options.new, true); assert.equal(options.runValidators, true);
      writes.push(clone({ type, filter, update }));
      if (type === "planner-events") {
        const converted = {};
        for (const [op, fields] of Object.entries(update)) converted[op] = Object.fromEntries(Object.entries(fields).filter(([k]) => k.startsWith("events.$.")).map(([k, v]) => [k.slice(9), v]));
        applyWrite(target, converted); r.__v = (r.__v || 0) + update.$inc.__v;
      } else applyWrite(target, update);
      assert.equal(new Model(r).validateSync(), undefined); return r;
    }, Model));
    stub(Model, "create", async (body) => { const r = { _id: EID, ...clone(body) }; assert.equal(new Model(r).validateSync(), undefined); records[type].set(String(r._id), r); writes.push(clone({ created: r, type })); return r; });
    stub(Model, "aggregate", async (pipeline) => {
      if (failDatabase) throw new Error("Private database credentials");
      let values = [...records[type].values()].map(clone);
      for (const s of pipeline) {
        if (s.$unwind) values = values.flatMap((r) => (r.events || []).map((e) => ({ ...r, events: e })));
        if (s.$project) values = values.map((r) => Object.fromEntries(Object.entries(s.$project).map(([k, v]) => [k, expression(r, v, k)])));
        if (s.$match) values = values.filter((r) => matches(r, s.$match));
        if (s.$count) return values.length ? [{ total: values.length }] : [];
        if (s.$sort) values.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a._id).localeCompare(String(b._id)));
        if (s.$skip) values = values.slice(s.$skip);
        if (s.$limit) values = values.slice(0, s.$limit);
      }
      return values;
    });
  }
  for (const Model of [Planner, Vendor, Client]) {
    stub(Model, "findById", (id) => query(() => profileMaps[Model.modelName].get(String(id)) || null));
    stub(Model, "findOne", (filter) => query(() => [...profileMaps[Model.modelName].values()].find((r) => matches(r, filter)) || null));
    stub(Model, "find", (filter) => query(() => [...profileMaps[Model.modelName].values()].filter((r) => matches(r, filter))));
  }
  stub(Notification, "create", async (body) => { if (failNotices) throw new Error("Delivery failed"); notices.push(clone(body)); return body; });
  stub(Message, "create", async (body) => { messages.push(clone(body)); return { _id: CID, ...body }; });
  const app = express(); app.use(express.json()); app.use("/admin", adminRoutes); app.use("/consultation", consultationRoutes); app.use("/events", eventRoutes); app.use("/board", plannerRoutes);
  server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  users = new Map([[ADMIN, { _id: ADMIN, id: ADMIN, role: "admin", username: "Admin" }], [MEMBER, { _id: MEMBER, id: MEMBER, role: "client", username: "Requester" }], [PROFESSIONAL, { _id: PROFESSIONAL, id: PROFESSIONAL, role: "planner", username: "Professional" }], [OTHER, { _id: OTHER, id: OTHER, role: "vendor", username: "Other" }], [MOD, { _id: MOD, id: MOD, role: "moderator", moderatorPermissions: ["users.read", "reports.manage", "content.manage"] }]]);
  records = {
    consultations: new Map([[CID, { _id: CID, user: MEMBER, targetUser: PROFESSIONAL, targetType: "PlannerProfile", fullName: "Requester", eventType: "Wedding", eventDate: "2026-12-01T12:00:00Z", status: "pending", notes: "Private consultation text", createdAt: "2000-01-01T12:00:00Z", oversightVersion: 0 }]]),
    events: new Map([[EID, { _id: EID, title: "Reception", date: "2026-12-01T12:00:00Z", status: "Upcoming", planner: PP, client: CP, vendors: [VP], createdAt: "2026-01-01T12:00:00Z", oversightVersion: 0 }]]),
    "planner-events": new Map([[BID, { _id: BID, planner: PROFESSIONAL, events: [{ _id: BEID, name: "Board party", date: "2026-12-01T12:00:00Z", status: "upcoming", client: CP, vendors: [{ vendor: VP, role: "Music" }], payments: [{ amount: 500, status: "paid" }], oversightVersion: 0 }], __v: 0 }]]),
  };
  profileMaps = { PlannerProfile: new Map([[PP, { _id: PP, userId: PROFESSIONAL }]]), ClientProfile: new Map([[CP, { _id: CP, user: MEMBER }]]), VendorProfile: new Map([[VP, { _id: VP, userId: OTHER }]]) };
  writes = []; notices = []; messages = []; conflict = false; race = false; failDatabase = false; failNotices = false;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [model, method, original] of originals) model[method] = original; if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
const token = (id = ADMIN, version = 0) => jwt.sign({ id, role: "admin", authVersion: version }, secret);
async function request(path, { id = ADMIN, auth = token(id), method, body } = {}) {
  const r = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, body: await r.json(), headers: r.headers };
}
const recordId = (type) => ({ consultations: CID, events: EID, "planner-events": BEID })[type];
const record = (type) => type === "planner-events" ? records[type].get(BID).events[0] : records[type].get(recordId(type));
const path = (type = "consultations") => `/admin/operations/${type}/${recordId(type)}`;
const act = (type = "consultations", body = {}) => request(path(type), { body: { action: "note", reason: "Review reason", expectedVersion: record(type).oversightVersion || 0, ...body } });

test("all oversight endpoints require a current admin role, including forged claims and moderator grants", async () => {
  for (const auth of [null, token(MEMBER), token(PROFESSIONAL), token(MOD)]) for (const endpoint of ["/admin/operations", path()]) assert.equal((await request(endpoint, { auth })).status, auth ? 403 : 401);
  for (const id of [MEMBER, PROFESSIONAL, MOD]) assert.equal((await request(path(), { id, body: { action: "decline", reason: "Fake", expectedVersion: 0 } })).status, 403);
  users.get(ADMIN).authVersion = 1; assert.equal((await act()).status, 401); assert.equal(writes.length, 0);
});

test("queues cover both event stores, bounded pagination, literal search and safe summaries", async () => {
  for (const type of Object.keys(service.models)) {
    const result = await request(`/admin/operations?type=${type}&page=999&pageSize=1`);
    assert.equal(result.status, 200); assert.equal(result.body.data.pagination.page, 1); assert.equal(result.body.data.records[0]._id, recordId(type)); assert.equal(result.headers.get("cache-control"), "no-store");
    assert.ok(!JSON.stringify(result.body).includes("Private")); assert.equal(Object.hasOwn(result.body.data.records[0], "payments"), false);
    assert.equal((await request(`/admin/operations?type=${type}&search=.*`)).body.data.pagination.total, 0);
    assert.equal((await request(`/admin/operations?type=${type}&flagged=yes`)).body.data.pagination.total, 0);
    await act(type, { action: "flag" }); assert.equal((await request(`/admin/operations?type=${type}&flagged=yes`)).body.data.pagination.total, 1);
  }
});

test("scheduled date filters use inclusive Lagos days and exact calendar validation", async () => {
  record("consultations").eventDate = "2026-11-30T23:00:00Z";
  assert.equal((await request("/admin/operations?from=2026-12-01&to=2026-12-01")).body.data.pagination.total, 1);
  record("consultations").eventDate = "2026-12-01T23:00:00Z";
  assert.equal((await request("/admin/operations?from=2026-12-01&to=2026-12-01")).body.data.pagination.total, 0);
  for (const q of ["from=2026-02-30", "from=2026-12-02&to=2026-12-01", "pageSize=101", "page=-1", "type=__proto__", "search[$ne]=x", "status=upcoming", "flagged=invalid", "unknown=x"]) assert.equal((await request(`/admin/operations?${q}`)).status, 400);
});

test("detail resolves User IDs versus profile IDs, preserves archives and diagnoses missing participants", async () => {
  users.get(MEMBER).archivedAt = "2026-01-01T00:00:00Z"; profileMaps.VendorProfile.delete(VP);
  for (const type of ["events", "planner-events"]) {
    const result = await request(path(type)); assert.equal(result.status, 200); assert.equal(result.body.data.participants[0].userId, PROFESSIONAL); assert.equal(result.body.data.participants[1].archived, true); assert.equal(result.body.data.participants[2].missingProfile, true);
    assert.ok(!JSON.stringify(result.body).includes("500"));
  }
  const c = await request(path()); assert.ok(!JSON.stringify(c.body).includes("Private consultation text")); assert.equal(c.body.data.participants[0].userId, MEMBER);
});

test("private notes and flags retain capped history, never alter status or notify participants", async () => {
  for (const type of Object.keys(service.models)) {
    const r = record(type); r.oversightHistory = Array.from({ length: 100 }, () => ({ _id: new mongoose.Types.ObjectId(), action: "note", by: ADMIN, reason: "Private", at: new Date().toISOString() })); const old = r.status;
    await act(type); assert.equal(r.oversightHistory.length, 100); assert.equal(r.oversightHistory.at(-1).action, "note");
    await act(type, { action: "flag" }); assert.equal(r.oversightFlag, true);
    await act(type, { action: "clear_flag" }); assert.equal(r.oversightFlag, false); assert.equal(r.status, old); assert.equal(r.oversightVersion, 3);
  }
  assert.equal(notices.length, 0);
});

test("consultation interventions decline, reopen or complete without impersonating approval", async () => {
  assert.equal((await act("consultations", { action: "complete" })).status, 409);
  assert.equal((await act("consultations", { action: "decline" })).status, 200); assert.ok(record("consultations").rejectedAt); assert.equal(notices.length, 2);
  assert.equal((await act("consultations", { action: "reopen" })).status, 200); assert.equal(record("consultations").status, "pending"); assert.equal(record("consultations").rejectedAt, null);
  record("consultations").status = "approved";
  assert.equal((await act("consultations", { action: "complete" })).status, 200); assert.ok(record("consultations").completedAt); assert.equal(record("consultations").oversightNotice.reason, "Review reason");
  assert.equal((await act("consultations", { action: "reopen" })).status, 409); assert.equal(messages.length, 0);
});

test("event transitions apply to the correct standalone or embedded record and preserve payments", async () => {
  for (const type of ["events", "planner-events"]) {
    const r = record(type), before = clone(r);
    assert.equal((await act(type, { action: "start" })).status, 200); assert.equal(service.status(r), "ongoing");
    assert.equal((await act(type, { action: "cancel" })).status, 200); assert.equal(service.status(r), "cancelled");
    assert.equal((await act(type, { action: "reopen" })).status, 200); assert.equal(service.status(r), "upcoming");
    assert.equal((await act(type, { action: "start" })).status, 200);
    assert.equal((await act(type, { action: "complete" })).status, 200); assert.equal(service.status(r), "completed");
    assert.deepEqual(r.payments, before.payments); assert.deepEqual(r.vendors, before.vendors); assert.equal((await act(type, { action: "cancel" })).status, 409);
  }
  assert.equal(records["planner-events"].get(BID).__v, 5);
  assert.ok(writes.some((w) => w.filter.events?.$elemMatch?._id === BEID));
});

test("stale versions and atomic conflicts cannot overwrite concurrent member changes", async () => {
  for (const type of Object.keys(service.models)) {
    const old = record(type).status;
    assert.equal((await act(type, { expectedVersion: 10 })).status, 409);
    conflict = true; assert.equal((await act(type, { action: type === "consultations" ? "decline" : "cancel" })).status, 409); conflict = false;
    race = true; assert.equal((await act(type, { action: type === "consultations" ? "decline" : "cancel" })).status, 409); race = false;
    assert.equal(record(type).status, old);
  }
  assert.equal(writes.length, 0); assert.equal(notices.length, 0);
});

test("unsupported actions, injected bodies, missing records and notification failures are handled", async () => {
  for (const body of [{ action: "approve" }, { reason: " " }, { reason: "x".repeat(1001) }, { expectedVersion: "0" }, { status: "approved" }, { $set: { oversightFlag: true } }]) assert.equal((await act("consultations", body)).status, 400);
  assert.equal((await request("/admin/operations/constructor/invalid")).status, 400);
  records.consultations.clear(); assert.equal((await request(path())).status, 404);
  failNotices = true; const result = await act("events", { action: "cancel" }); assert.equal(result.status, 200); assert.equal(result.body.notificationWarning, true); assert.equal(record("events").status, "Cancelled");
  failDatabase = true; for (const result of [await request("/admin/operations"), await request(path("events")), await act("events")]) { assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("Private database credentials")); }
});

test("members cannot decide or delete another participant's request and decisions are recipient-only", async () => {
  for (const id of [MEMBER, OTHER]) assert.equal((await request(`/consultation/${CID}/status`, { id, method: "PATCH", body: { status: "approved" } })).status, id === MEMBER ? 403 : 404);
  assert.equal((await request(`/consultation/${CID}`, { id: OTHER, method: "DELETE" })).status, 404);
  const approved = await request(`/consultation/${CID}/status`, { id: PROFESSIONAL, method: "PATCH", body: { status: "approved" } }); assert.equal(approved.status, 200); assert.equal(record("consultations").status, "approved"); assert.equal(messages.length, 1); assert.equal(messages[0].sender, PROFESSIONAL); assert.equal(messages[0].recipient, MEMBER);
  assert.equal((await request(`/consultation/${CID}/status`, { id: PROFESSIONAL, method: "PATCH", body: { status: "approved" } })).status, 409); assert.equal(messages.length, 1);
  assert.equal((await request(`/consultation/${CID}`, { id: MEMBER, method: "DELETE" })).status, 409);
});

test("only an unreviewed pending requester can delete; staff review protects the saved record", async () => {
  await act(); assert.equal((await request(`/consultation/${CID}`, { id: MEMBER, method: "DELETE" })).status, 409);
  const r = record("consultations"); r.oversightHistory = []; r.oversightVersion = 0;
  race = true; assert.equal((await request(`/consultation/${CID}`, { id: MEMBER, method: "DELETE" })).status, 409); race = false; r.oversightVersion = 0;
  assert.equal((await request(`/consultation/${CID}`, { id: MEMBER, method: "DELETE" })).status, 200);
});

test("member reads scope pending requests and events, and redact all private oversight metadata", async () => {
  const c = record("consultations"); c.oversightHistory = [{ reason: "Private staff note" }]; c.oversightFlag = true;
  const pending = await request("/consultation/pending", { id: PROFESSIONAL }); assert.equal(pending.body.length, 1); assert.ok(!JSON.stringify(pending.body).includes("Private staff note"));
  assert.equal((await request("/consultation/pending", { id: OTHER })).body.length, 0);
  assert.equal((await request("/consultation/pending", { id: MEMBER })).status, 403);
  for (const id of [MEMBER, PROFESSIONAL, OTHER]) {
    record("events").oversightHistory = [{ reason: "Private staff note" }];
    const result = await request("/events", { id }); assert.equal(result.status, 200); assert.equal(result.body.events.length, 1); assert.ok(!JSON.stringify(result.body).includes("Private staff note"));
  }
  assert.equal((await request("/events", { auth: null })).status, 401);
  profileMaps.VendorProfile.clear(); assert.equal((await request("/events", { id: OTHER })).body.events.length, 0);
});

test("event creation enforces planner ownership and prevents status or oversight injection", async () => {
  const body = { title: "New event", date: "2026-12-15", planner: PP, client: CP, vendors: [VP] };
  assert.equal((await request("/events", { id: MEMBER, body })).status, 403);
  assert.equal((await request("/events", { id: PROFESSIONAL, body: { ...body, planner: VP } })).status, 403);
  for (const fields of [{ status: "Completed" }, { oversightFlag: true }, { oversightHistory: [] }]) assert.equal((await request("/events", { id: PROFESSIONAL, body: { ...body, ...fields } })).status, 400);
  profileMaps.VendorProfile.get(VP).active = false; assert.equal((await request("/events", { id: PROFESSIONAL, body })).status, 404);
  profileMaps.VendorProfile.get(VP).active = true;
  const result = await request("/events", { id: PROFESSIONAL, body }); assert.equal(result.status, 201); assert.equal(result.body.event.status, "Upcoming"); assert.equal(result.body.event.planner, PP);
});

test("planner board member status updates respect admin cancellation and current embedded revision", async () => {
  await act("planner-events", { action: "cancel" });
  assert.equal((await request(`/board/events/${BEID}`, { id: PROFESSIONAL, method: "PATCH", body: { status: "ongoing" } })).status, 409);
  await act("planner-events", { action: "reopen" });
  const result = await request(`/board/events/${BEID}`, { id: PROFESSIONAL, method: "PATCH", body: { status: "ongoing" } }); assert.equal(result.status, 200); assert.equal(record("planner-events").status, "ongoing"); assert.equal(record("planner-events").oversightVersion, 3);
  assert.ok(!JSON.stringify(result.body).includes("oversightHistory"));
});

test("legacy oversight records accept missing revision, and schemas keep staff metadata private", async () => {
  const r = record("consultations"); delete r.oversightVersion;
  assert.equal((await act()).status, 200); assert.equal(r.oversightVersion, 1);
  assert.ok(writes[0].filter.$or.some((f) => f.oversightVersion?.$exists === false));
  for (const Model of [Event, Consultation]) for (const key of ["oversightHistory", "oversightVersion", "oversightFlag"]) assert.equal(Model.schema.path(key).options.select, false);
  assert.equal(Board.schema.options.optimisticConcurrency, true);
  const safe = service.memberRecord({ oversightHistory: [{ reason: "private" }], oversightFlag: true, oversightVersion: 2, oversightNotice: { reason: "Participant reason" }, title: "Safe" });
  assert.deepEqual(safe, { oversightNotice: { reason: "Participant reason" }, title: "Safe" });
});

test("self-involved admins cannot change status and an embedded intervention leaves siblings intact", async () => {
  record("consultations").user = ADMIN;
  const data = (await request(path())).body.data; assert.deepEqual(data.allowedActions, ["note", "flag"]);
  assert.equal((await act("consultations", { action: "decline" })).status, 409);
  const board = records["planner-events"].get(BID); const sibling = { ...clone(board.events[0]), _id: EID, name: "Other event" }; board.events.push(sibling);
  assert.equal((await act("planner-events", { action: "cancel" })).status, 200); assert.deepEqual(board.events[1], sibling);
});

test("attention indicators distinguish stale pending requests from past active events", async () => {
  assert.equal((await request("/admin/operations")).body.data.records[0].attention, true);
  record("consultations").status = "approved"; assert.equal((await request("/admin/operations")).body.data.records[0].attention, false);
  for (const type of ["events", "planner-events"]) {
    record(type).date = "2000-01-01T12:00:00Z"; assert.equal((await request(`/admin/operations?type=${type}`)).body.data.records[0].attention, true);
    record(type).status = type === "events" ? "Completed" : "completed"; assert.equal((await request(`/admin/operations?type=${type}`)).body.data.records[0].attention, false);
  }
});

test("consultation creation cannot forge staff notices, history, versions, or sender ownership", async () => {
  const response = await request("/consultation", { id: MEMBER, body: { targetUser: PROFESSIONAL, targetType: "PlannerProfile", fullName: "Client", eventType: "Wedding", eventDate: "2026-12-01", user: ADMIN, status: "approved", oversightVersion: 999, oversightFlag: true, oversightNotice: { reason: "Forged" }, oversightHistory: [{ action: "note", reason: "Forged" }] } });
  assert.equal(response.status, 201); const created = writes[0].created;
  assert.equal(created.user, MEMBER); assert.equal(created.status, "pending");
  for (const key of ["oversightVersion", "oversightFlag", "oversightNotice", "oversightHistory"]) assert.equal(Object.hasOwn(created, key), false);
});
