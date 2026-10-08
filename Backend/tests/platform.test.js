const audit = require("./helpers/staffAuditStub").install();
const settings = require("./helpers/platformSettingsStub").install();
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const fs = require("node:fs/promises");
const User = require("../src/models/user.model");
const ClientProfile = require("../src/models/clientProfile.model");
const VendorProfile = require("../src/models/vendorProfile.model");
const Consultation = require("../src/models/initialConsultation.model");
const Notification = require("../src/models/notification.model");
const service = require("../src/services/platformSettings.service");
const health = require("../src/services/platformHealth.service");
const adminRoutes = require("../src/routes/admin.routes");
const authRoutes = require("../src/routes/auth.routes");
const consultationRoutes = require("../src/routes/initialConsultation.routes");
const platformRoutes = require("../src/routes/platform.routes");
const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa", MEMBER = "bbbbbbbbbbbbbbbbbbbbbbbb", MOD = "cccccccccccccccccccccccc", VENDOR = "dddddddddddddddddddddddd", CID = "111111111111111111111111", PID = "222222222222222222222222";
const secret = "platform-test-secret", originals = [], env = {};
const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
let users, createdUsers, consultations, notices, dbState, ping, uploadState, server, base, app;
let dbDescriptor, stateDescriptor;
function query(get) { return { select() { return this; }, sort() { return this; }, populate() { return this; }, async exec() { return clone(await get()); }, lean() { return this.exec(); }, then(resolve, reject) { return this.exec().then(resolve, reject); } }; }
function stub(model, method, impl) { originals.push([model, method, model[method]]); model[method] = impl; }
before(async () => {
  for (const key of ["JWT_SECRET", "DBSTRING", "ANALYTICS_SECRET"]) env[key] = process.env[key];
  process.env.JWT_SECRET = secret; process.env.DBSTRING = "private-database-url"; process.env.ANALYTICS_SECRET = "private-analytics-key";
  dbDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, "db"); stateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
  Object.defineProperty(mongoose.connection, "db", { configurable: true, get: () => ({ command: (...args) => ping(...args) }) });
  Object.defineProperty(mongoose.connection, "readyState", { configurable: true, get: () => dbState });
  stub(fs, "stat", async () => { if (uploadState === "missing") throw new Error("Private storage path"); return { isDirectory: () => uploadState !== "file" }; });
  stub(fs, "access", async () => { if (uploadState === "denied") throw new Error("Private permission error"); });
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null));
  stub(User, "findOne", (filter) => query(() => [...users.values()].find((u) => u.email === filter.email) || null));
  stub(User.prototype, "save", async function () { assert.equal(this.validateSync(), undefined); createdUsers.push(this.toObject()); return this; });
  stub(ClientProfile.prototype, "save", async function () { return this; });
  stub(bcrypt, "hash", async () => "test-password-hash"); stub(bcrypt, "compare", async () => true);
  stub(VendorProfile, "findOne", () => query(() => ({ _id: PID, userId: VENDOR, active: true })));
  stub(Consultation, "create", async (body) => { const c = new Consultation({ _id: CID, ...body }); assert.equal(c.validateSync(), undefined); consultations.push(clone(c.toObject())); return c; });
  stub(Consultation, "find", () => query(() => [{ _id: CID, user: MEMBER, targetUser: VENDOR, status: "pending", targetType: "VendorProfile", fullName: "Requester" }]));
  stub(Consultation, "findOne", () => query(() => ({ _id: CID, user: MEMBER, targetUser: VENDOR, status: "pending", targetType: "VendorProfile", oversightVersion: 0 })));
  stub(Consultation, "findOneAndUpdate", (filter, update) => query(() => ({ _id: CID, user: MEMBER, targetUser: VENDOR, targetType: "VendorProfile", status: update.$set.status, oversightVersion: 1 })));
  stub(Notification, "create", async (body) => { notices.push(body); return body; });
  app = express(); app.use(express.json()); app.use("/admin", adminRoutes); app.use("/auth", authRoutes); app.use("/consultation", consultationRoutes); app.use("/platform", platformRoutes);
  server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  users = new Map([[ADMIN, { _id: ADMIN, username: "Admin", role: "admin" }], [MEMBER, { _id: MEMBER, username: "Member", role: "client", email: "member@example.com", password: "hash" }], [MOD, { _id: MOD, username: "Moderator", role: "moderator", moderatorPermissions: ["users.read", "analytics.read", "content.manage"] }], [VENDOR, { _id: VENDOR, username: "Vendor", role: "vendor" }]]);
  createdUsers = []; consultations = []; notices = []; dbState = 1; uploadState = "accessible";
  ping = async (command, options) => { assert.deepEqual(command, { ping: 1 }); assert.equal(options.timeoutMS, 2000); return { ok: 1 }; };
  app.set("io", { of: () => ({ sockets: new Map([["one", {}], ["two", {}]]) }) });
  process.env.DBSTRING = "private-database-url"; process.env.JWT_SECRET = secret; process.env.ANALYTICS_SECRET = "private-analytics-key";
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const [model, method, original] of originals) model[method] = original;
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  for (const [key, descriptor] of [["db", dbDescriptor], ["readyState", stateDescriptor]]) if (descriptor) Object.defineProperty(mongoose.connection, key, descriptor); else delete mongoose.connection[key];
});
const token = (id = ADMIN, extra = {}) => jwt.sign({ id, role: "admin", authVersion: 0, ...extra }, secret);
async function request(path, { id = ADMIN, auth = token(id), body, method } = {}) {
  const r = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, body: await r.json(), headers: r.headers };
}
const update = (body = {}, options = {}) => request("/admin/platform/settings", { method: "PATCH", body: { registration: { client: true, vendor: false, planner: true }, consultationsEnabled: true, expectedVersion: settings.row?.version ?? 0, note: "Pause vendor intake during review", ...body }, ...options });
const signup = (role) => request("/auth/register", { auth: null, body: { username: `New ${role}`, email: `${role}@new.example.com`, password: "password123", phone: "123456789", role } });
const consult = (extra = {}) => request("/consultation", { id: MEMBER, body: { targetUser: VENDOR, targetType: "VendorProfile", fullName: "Member", eventType: "Wedding", eventDate: "2026-12-01", ...extra } });
const entries = () => [...audit.entries.values()];

test("health and settings require an authenticated current admin, regardless of token claims", async () => {
  for (const auth of [null, "invalid", token(ADMIN, { purpose: "support" }), token(ADMIN, { exp: 1 })]) {
    for (const path of ["/admin/platform/health", "/admin/platform/settings"]) assert.equal((await request(path, { auth })).status, 401);
    assert.equal((await update({}, { auth })).status, 401);
  }
  for (const id of [MEMBER, MOD, VENDOR]) {
    for (const path of ["/admin/platform/health", "/admin/platform/settings"]) assert.equal((await request(path, { id })).status, 403);
    assert.equal((await update({}, { id })).status, 403);
  }
  assert.equal(settings.writes.length, 0); assert.equal(entries().length, 1); assert.equal(entries()[0].actorRole, "moderator"); assert.equal(entries()[0].outcome, "denied");
  users.get(ADMIN).authVersion = 1; assert.equal((await update()).status, 401);
});

test("missing settings preserve existing open defaults without creating a database record", async () => {
  const publicResult = await request("/platform/availability", { auth: null }); assert.equal(publicResult.status, 200); assert.deepEqual(publicResult.body.data, service.defaults()); assert.equal(publicResult.headers.get("cache-control"), "no-store");
  const r = await request("/admin/platform/settings"); assert.equal(r.status, 200); assert.equal(r.body.data.version, 0); assert.equal(r.body.data.updatedAt, null); assert.deepEqual(r.body.data.history, []); assert.equal(settings.writes.length, 0);
});

test("validated settings save a single versioned snapshot with private reason and central audit", async () => {
  const r = await update(); assert.equal(r.status, 200); assert.equal(r.body.data.version, 1); assert.equal(r.body.data.registration.vendor, false); assert.equal(settings.writes.length, 1);
  const h = r.body.data.history[0]; assert.equal(h.by, ADMIN); assert.equal(h.note, "Pause vendor intake during review"); assert.deepEqual(h.before, service.defaults()); assert.equal(h.after.registration.vendor, false);
  const e = entries()[0]; assert.equal(e.outcome, "succeeded"); assert.equal(e.category, "settings"); assert.equal(e.targetKind, "platform"); assert.equal(e.targetId, service.ID); assert.equal(e.resultVersion, 1); assert.deepEqual(e.settingsChange, { before: h.before, after: h.after });
  const detail = await request(`/admin/audit/${e._id}`); assert.equal(detail.body.data.targetLink, "/admin/platform"); assert.deepEqual(detail.body.data.settingsChange, e.settingsChange);
  const publicResult = await request("/platform/availability", { auth: null }); assert.deepEqual(Object.keys(publicResult.body.data).sort(), ["consultationsEnabled", "registration"]); assert.doesNotMatch(JSON.stringify(publicResult.body), /Pause vendor intake|history|version|by|private-|000000000000000000000014/);
});

test("settings reject mass assignment, invalid booleans, revisions, reasons, and no-op saves", async () => {
  for (const body of [{ registration: { client: true, vendor: false, planner: true, admin: true } }, { registration: { client: true, vendor: false } }, { consultationsEnabled: "false" }, { expectedVersion: "0" }, { expectedVersion: -1 }, { expectedVersion: Number.MAX_SAFE_INTEGER }, { note: " " }, { note: "x".repeat(1001) }, { history: [] }, { version: 999 }, { actorId: MEMBER }, { registration: [] }, { registration: null }, { registration: { client: true, vendor: 0, planner: true } }, { registration: service.defaults().registration }]) assert.equal((await update(body)).status, 400);
  assert.equal(settings.writes.length, 0); assert.ok(entries().every((e) => e.outcome === "denied"));
});

test("stale or concurrent edits cannot overwrite a newer settings revision", async () => {
  assert.equal((await update()).status, 200); assert.equal((await update({ expectedVersion: 0, consultationsEnabled: false })).status, 409); assert.equal(settings.row.consultationsEnabled, true);
  const results = await Promise.all([update({ consultationsEnabled: false }), update({ registration: { client: false, vendor: false, planner: true } })]); assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]); assert.equal(settings.row.version, 2); assert.equal(settings.row.history.length, 2);
});

test("first-save singleton races and failed writes return a reviewable conflict or unavailable response", async () => {
  settings.conflict = true; assert.equal((await update()).status, 409); assert.equal(settings.row, null);
  settings.conflict = false; settings.failWrite = true; const r = await update(); assert.equal(r.status, 503); assert.doesNotMatch(JSON.stringify(r.body), /Private|credentials/); assert.equal(settings.writes.length, 0); assert.equal(entries().at(-1).outcome, "failed");
});

test("audit reservation failure prevents settings writes and completion failure preserves the saved change", async () => {
  audit.failCreate = true; assert.equal((await update()).status, 503); assert.equal(settings.writes.length, 0);
  audit.failCreate = false; audit.failFinish = true; const r = await update(); assert.equal(r.status, 200); assert.equal(settings.row.registration.vendor, false); assert.equal(r.headers.get("x-staff-audit-status"), "pending"); assert.match(r.body.auditWarning, /unconfirmed/); assert.equal(entries()[0].outcome, "pending");
});

test("public signup pauses each member role before any user write and reopening takes effect immediately", async () => {
  for (const role of ["client", "vendor", "planner"]) {
    settings.row = { ...service.defaults(), registration: { client: true, vendor: true, planner: true, [role]: false }, version: 1 };
    const blocked = await signup(role); assert.equal(blocked.status, 503); assert.equal(blocked.body.code, "PLATFORM_PAUSED"); assert.equal(createdUsers.length, 0);
  }
  settings.row = null;
  for (const role of ["client", "vendor", "planner"]) assert.equal((await signup(role)).status, 201);
  assert.equal(createdUsers.length, 3);
  assert.equal((await signup("admin")).status, 400); assert.equal((await signup("moderator")).status, 400);
});

test("selective signup pause leaves other roles open and settings failures fail closed", async () => {
  await update(); assert.equal((await signup("planner")).status, 201); assert.equal((await signup("vendor")).status, 503);
  settings.failRead = true; const blocked = await signup("client"); assert.equal(blocked.status, 503); assert.equal(blocked.body.code, "PLATFORM_UNAVAILABLE"); assert.equal(createdUsers.length, 1); assert.doesNotMatch(JSON.stringify(blocked.body), /Private|credentials/);
  assert.equal((await request("/platform/availability", { auth: null })).status, 503); assert.equal((await request("/admin/platform/settings")).status, 503);
});

test("paused new consultations reject direct API submissions before writes or notifications", async () => {
  await update({ consultationsEnabled: false });
  const r = await consult({ consultationsEnabled: true, platform: { consultationsEnabled: true } }); assert.equal(r.status, 503); assert.equal(r.body.code, "PLATFORM_PAUSED"); assert.equal(consultations.length, 0); assert.equal(notices.length, 0);
  await update({ consultationsEnabled: true }); assert.equal((await consult()).status, 201); assert.equal(consultations.length, 1); assert.equal(notices.length, 1);
  settings.failRead = true; assert.equal((await consult()).status, 503); assert.equal(consultations.length, 1);
});

test("login and existing consultation review stay available during pauses and settings outages", async () => {
  settings.row = { registration: { client: false, vendor: false, planner: false }, consultationsEnabled: false, version: 2 }; settings.failRead = true;
  const login = await request("/auth/login", { auth: null, body: { email: "member@example.com", password: "password" } }); assert.equal(login.status, 200);
  const existing = await request("/consultation/mine", { id: MEMBER }); assert.equal(existing.status, 200); assert.equal(existing.body[0]._id, CID);
  const decision = await request(`/consultation/${CID}/status`, { id: VENDOR, method: "PATCH", body: { status: "declined" } }); assert.equal(decision.status, 200); assert.equal(decision.body.consultation.status, "declined");
});

test("health returns actual process and service snapshots without secrets or connection details", async () => {
  const r = await request("/admin/platform/health"); assert.equal(r.status, 200); assert.equal(r.headers.get("cache-control"), "no-store"); const d = r.body.data; assert.equal(d.status, "healthy"); assert.ok(d.runtime.memory.rssBytes > 0); assert.ok(d.runtime.uptimeSeconds >= 0); assert.ok(d.checkedAt);
  assert.equal(d.checks.database.status, "healthy"); assert.ok(d.checks.database.latencyMs >= 0); assert.equal(d.checks.realtime.connections, 2); assert.match(d.checks.realtime.message, /multiple tabs/); assert.match(d.checks.uploads.message, /Actual upload and disk capacity are untested/); assert.equal(d.checks.audit.pendingOverFiveMinutes, 0);
  assert.doesNotMatch(JSON.stringify(r.body), /private-|platform-test-secret|DBSTRING|JWT_SECRET|ANALYTICS_SECRET|Desktop|password|mongodb/);
});

test("database disconnect and pending audit entries correctly produce attention instead of invented health", async () => {
  dbState = 0; const down = await request("/admin/platform/health"); assert.equal(down.body.data.status, "attention"); assert.equal(down.body.data.checks.database.status, "unavailable"); assert.equal(down.body.data.checks.audit.status, "unavailable");
  dbState = 1; await update(); const e = entries()[0]; e.outcome = "pending"; e.attemptedAt = new Date(Date.now() - 400000).toISOString();
  const r = await request("/admin/platform/health"); assert.equal(r.body.data.checks.audit.status, "attention"); assert.equal(r.body.data.checks.audit.pendingOverFiveMinutes, 1);
  audit.failRead = true; assert.equal((await request("/admin/platform/health")).body.data.checks.audit.status, "unavailable");
});

test("storage, settings, realtime, and missing configuration failures stay isolated and redacted", async () => {
  for (const value of ["missing", "file", "denied"]) { uploadState = value; assert.equal((await request("/admin/platform/health")).body.data.checks.uploads.status, "unavailable"); }
  settings.failRead = true; app.set("io", null); delete process.env.DBSTRING; delete process.env.ANALYTICS_SECRET;
  const r = await request("/admin/platform/health"); assert.equal(r.body.data.checks.settings.status, "unavailable"); assert.equal(r.body.data.checks.realtime.connections, null); assert.equal(r.body.data.checks.configuration.configured.database, false); assert.equal(r.body.data.checks.configuration.configured.analytics, true); assert.equal(r.body.data.status, "attention"); assert.doesNotMatch(JSON.stringify(r.body), /Private|private-/);
});

test("health probe timeout returns a bounded failure while reporting other checks", async () => {
  ping = () => new Promise(() => {}); const start = performance.now(); const r = await request("/admin/platform/health"); assert.equal(r.body.data.checks.database.status, "unavailable"); assert.equal(r.body.data.checks.settings.status, "healthy"); assert.ok(performance.now() - start < 4500);
  await assert.rejects(health.probe(() => new Promise(() => {}), 15), /timed out/);
});

test("public readiness responds with only ready or unavailable and no authenticated health data", async () => {
  const up = await request("/platform/ready", { auth: null }); assert.equal(up.status, 200); assert.deepEqual(up.body, { status: "ready" }); assert.equal(up.headers.get("cache-control"), "no-store");
  dbState = 0; const down = await request("/platform/ready", { auth: null }); assert.equal(down.status, 503); assert.deepEqual(down.body, { status: "unavailable" });
  dbState = 1; ping = async () => { throw new Error("private-database-url"); }; assert.deepEqual((await request("/platform/ready", { auth: null })).body, { status: "unavailable" });
});

test("central settings snapshots remain available beyond the recent 100 settings changes", async () => {
  for (let n = 0; n < 101; n++) assert.equal((await update({ consultationsEnabled: n % 2 === 0 })).status, 200);
  assert.equal(settings.row.history.length, 100); assert.equal(settings.row.history[0].version, 2); assert.equal(entries().length, 101);
  const oldest = await request(`/admin/audit/${entries()[0]._id}`); assert.equal(oldest.body.data.settingsChange.before.registration.vendor, true); assert.equal(oldest.body.data.settingsChange.after.registration.vendor, false); assert.equal(oldest.body.data.resultVersion, 1);
});
