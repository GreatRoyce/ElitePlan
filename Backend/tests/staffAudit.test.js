const audit = require("./helpers/staffAuditStub").install();
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const Announcement = require("../src/models/announcement.model");
const Audit = require("../src/models/staffAudit.model");
const adminRoutes = require("../src/routes/admin.routes");
const middleware = require("../src/middleware/staffAudit");
const authMiddleware = require("../src/middleware/authMiddleware");
const service = require("../src/services/staffAudit.service");
const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa", MEMBER = "bbbbbbbbbbbbbbbbbbbbbbbb", MOD = "cccccccccccccccccccccccc", TARGET = "dddddddddddddddddddddddd";
const secret = "audit-test-secret", previousSecret = process.env.JWT_SECRET, originals = [];
let users, writes, conflict, server, base;
const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
function query(get) { return { select() { return this; }, lean: async () => clone(await get()), then(resolve, reject) { return Promise.resolve().then(get).then(resolve, reject); } }; }
function stub(m, method, fn) { originals.push([m, method, m[method]]); m[method] = fn; }
before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null));
  stub(User, "findOneAndUpdate", (filter, update) => query(() => {
    const u = users.get(String(filter._id)); if (!u || conflict) return null;
    const expected = filter.moderationVersion ?? 0; if ((u.moderationVersion || 0) !== expected) return null;
    Object.assign(u, clone(update.$set)); for (const [k, inc] of Object.entries(update.$inc)) u[k] = (u[k] || 0) + inc;
    for (const [k, values] of Object.entries(update.$push || {})) u[k] = [...(u[k] || []), ...clone(values.$each)].slice(values.$slice);
    writes.push(clone(update)); return u;
  }));
  stub(Announcement, "findOne", () => query(() => null));
  stub(Announcement, "create", async (payload) => { const a = new Announcement(payload); assert.equal(a.validateSync(), undefined); return a; });
  const app = express(); app.use(express.json()); app.use("/admin", adminRoutes);
  app.post("/probe/:userId", authMiddleware(["admin"]), middleware({ category: "staff", targetKind: "account", targetParam: "userId", route: "/probe/:userId", action: "update" }), (req, res) => res.json({ success: true, data: { role: "moderator", version: 7, staff: { permissions: ["users.read", "users.warn"] }, password: "SECRET", email: "PRIVATE", actorId: MEMBER, token: "TOKEN" } }));
  app.use((req, res) => res.status(404).json({ success: false, message: "Route not found." }));
  server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  users = new Map([[ADMIN, { _id: ADMIN, username: "Original admin name", role: "admin" }], [MEMBER, { _id: MEMBER, username: "Member", role: "client" }], [MOD, { _id: MOD, username: "Moderator", role: "moderator", moderatorPermissions: ["users.read", "users.warn"] }], [TARGET, { _id: TARGET, username: "Target member", role: "client", accountStatus: "active", moderationVersion: 0 }]]);
  writes = []; conflict = false;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [m, method, original] of originals) m[method] = original; if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
const token = (id = ADMIN, extra = {}) => jwt.sign({ id, role: "admin", authVersion: 0, ...extra }, secret);
async function request(path, { id = ADMIN, auth = token(id), body, method } = {}) {
  const r = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, data: await r.json(), headers: r.headers };
}
const act = (body = {}, id = ADMIN) => request(`/admin/users/${TARGET}/moderation`, { id, body: { action: "warn", expectedVersion: users.get(TARGET).moderationVersion, reason: "Review reason", ...body } });
const entries = () => [...audit.entries.values()];

test("only admins can read audit history and members cannot submit audit records", async () => {
  for (const id of [MEMBER, MOD]) for (const path of ["/admin/audit", `/admin/audit/${TARGET}`]) assert.equal((await request(path, { id })).status, 403);
  for (const auth of [null, "invalid", token(ADMIN, { purpose: "support" }), jwt.sign({ id: ADMIN, exp: 1 }, secret)]) assert.equal((await request("/admin/audit", { auth })).status, 401);
  assert.equal((await request("/admin/audit", { body: { actorId: MEMBER, action: "ban" } })).status, 404);
  assert.equal(entries().length, 0);
});
test("successful actions persist verified actor snapshots, target, reason, time, and outcome", async () => {
  const r = await act(); assert.equal(r.status, 200); assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(entries().length, 1);
  const e = entries()[0]; assert.equal(e.actorId, ADMIN); assert.equal(e.actorName, "Original admin name"); assert.equal(e.actorRole, "admin"); assert.equal(e.targetId, TARGET); assert.equal(e.category, "moderation"); assert.equal(e.action, "warn"); assert.equal(e.note, "Review reason"); assert.equal(e.outcome, "succeeded"); assert.equal(e.httpStatus, 200); assert.equal(e.expectedVersion, 0); assert.equal(e.resultVersion, 1); assert.equal(e.resultState, "active"); assert.ok(e.completedAt);
  users.get(ADMIN).username = "Changed admin name"; const detail = await request(`/admin/audit/${e._id}`); assert.equal(detail.data.data.actorName, "Original admin name"); assert.equal(detail.data.data.targetLink, `/admin/users/${TARGET}`);
});
test("moderator grants, denials, and forged token roles record the actual database role", async () => {
  assert.equal((await act({}, MOD)).status, 200); assert.equal(entries()[0].actorRole, "moderator"); assert.equal(entries()[0].outcome, "succeeded");
  assert.equal((await act({ action: "ban" }, MOD)).status, 403); assert.equal(entries()[1].outcome, "denied"); assert.equal(entries()[1].actorId, MOD);
  const before = entries().length; assert.equal((await act({}, MEMBER)).status, 403); assert.equal(entries().length, before);
});
test("every administrative mutation route records an attempt before its permission or input checks", async () => {
  const cases = [
    [`/admin/users/${TARGET}/moderation`, "moderation", "ban", "account"], [`/admin/users/${TARGET}/archive`, "archive", "archive", "account"], [`/admin/users/${TARGET}/staff`, "staff", "appoint", "account"], [`/admin/reports/${TARGET}/actions`, "reports", "claim", "report"], [`/admin/verification/vendor/${TARGET}`, "verification", "approve", "vendor"], [`/admin/content/planner/${TARGET}`, "content", "hide", "planner"], [`/admin/operations/events/${TARGET}`, "operations", "cancel", "events"], [`/admin/support/${TARGET}`, "support", "claim", "support"], [`/admin/announcements/${TARGET}/actions`, "announcements", "publish", "announcement"],
  ];
  for (const [path, category, action, kind] of cases) {
    const r = await request(path, { body: { action, expectedVersion: -1, reason: "Review reason", note: "Private note" } }); assert.equal(r.status, 400, path);
    const e = entries().at(-1); assert.equal(e.category, category); assert.equal(e.action, action); assert.equal(e.targetKind, kind); assert.equal(e.targetId, TARGET); assert.equal(e.outcome, "denied");
  }
  await request("/admin/announcements", { body: {} }); assert.equal(entries().at(-1).action, "create");
  await request(`/admin/announcements/${TARGET}`, { method: "PATCH", body: {} }); assert.equal(entries().at(-1).action, "update");
  assert.equal(entries().length, 11); assert.equal(writes.length, 0);
});
test("reservation failure blocks a staff mutation before the business write", async () => {
  audit.failCreate = true; const r = await act(); assert.equal(r.status, 503); assert.match(r.data.message, /was not started/); assert.equal(writes.length, 0); assert.equal(entries().length, 0); assert.doesNotMatch(JSON.stringify(r.data), /Private audit unavailable/);
});
test("completion failure preserves the pending audit and warns without misreporting the saved action", async () => {
  audit.failFinish = true; const r = await act(); assert.equal(r.status, 200); assert.equal(writes.length, 1); assert.match(r.data.message, /unconfirmed/); assert.equal(r.headers.get("x-staff-audit-status"), "pending"); assert.equal(entries()[0].outcome, "pending");
  entries()[0].attemptedAt = new Date(Date.now() - 600000).toISOString(); const detail = await request(`/admin/audit/${entries()[0]._id}`); assert.equal(detail.data.data.completionUnconfirmed, true); assert.equal(detail.data.data.targetLink, `/admin/users/${TARGET}`);
});
test("an unmatched terminal write is reported as unconfirmed, rather than claimed as audited", async () => {
  audit.finishConflict = true; const r = await act(); assert.equal(r.status, 200); assert.ok(r.data.auditWarning); assert.equal(entries()[0].outcome, "pending");
});
test("denied and failed HTTP outcomes do not claim that business changes were applied", async () => {
  conflict = true; const denied = await act(); assert.equal(denied.status, 409); assert.equal(entries()[0].outcome, "denied"); assert.equal(entries()[0].resultVersion, null); conflict = false;
  const original = User.findOneAndUpdate; User.findOneAndUpdate = () => query(() => { throw new Error("Private business write failure"); });
  try { const r = await act(); assert.equal(r.status, 500); assert.equal(entries()[1].outcome, "failed"); assert.equal(entries()[1].httpStatus, 500); assert.equal(writes.length, 0); } finally { User.findOneAndUpdate = original; }
});
test("invalid target/action and privileged injected fields cannot forge stored identity or payload", async () => {
  const r = await act({ actorId: MEMBER, password: "PASSWORD_SECRET", token: "TOKEN_SECRET", message: "MESSAGE_SECRET", action: "not-supported" }); assert.equal(r.status, 400);
  assert.equal(entries()[0].actorId, ADMIN); assert.equal(entries()[0].action, "invalid"); assert.doesNotMatch(JSON.stringify(entries()[0]), /PASSWORD_SECRET|TOKEN_SECRET|MESSAGE_SECRET|not-supported/);
  assert.equal((await request(`/admin/content/account/${TARGET}`, { body: { action: "hide", expectedVersion: 0, reason: "Review" } })).status, 400); assert.equal(entries()[1].targetKind, "unknown");
});
test("the audit captures only safe response metadata, including moderator grants", async () => {
  const r = await request(`/probe/${TARGET}`, { body: { reason: "Safe review note", expectedVersion: 6 } }); assert.equal(r.status, 200);
  const e = entries()[0]; assert.equal(e.actorId, ADMIN); assert.equal(e.resultRole, "moderator"); assert.deepEqual(e.resultPermissions, ["users.read", "users.warn"]); assert.doesNotMatch(JSON.stringify(e), /SECRET|PRIVATE|TOKEN|password|email/);
});
test("created records receive their server-assigned target ID in the completed audit", async () => {
  const r = await request("/admin/announcements", { body: { title: "Site notice", body: "A notice for all registered members.", audiences: ["client"], important: false, startsAt: null, endsAt: null, note: "Publication review", requestId: randomUUID() } }); assert.equal(r.status, 201);
  assert.equal(entries()[0].targetId, String(r.data.data._id)); assert.equal(entries()[0].outcome, "succeeded"); assert.equal(service.dto(entries()[0]).targetLink, `/admin/announcements/${r.data.data._id}`);
});
test("client disconnection records an unconfirmed outcome without claiming a mutation", async () => {
  const req = { user: users.get(ADMIN), method: "POST", params: { userId: TARGET }, body: { action: "warn", reason: "Review" } }, res = new EventEmitter();
  res.set = () => res; res.json = () => res; res.status = () => res; res.statusCode = 200;
  await middleware({ category: "moderation", targetKind: "account", targetParam: "userId", route: "/users/:userId/moderation" })(req, res, () => { res.destroyed = true; res.emit("close"); });
  await new Promise((resolve) => setImmediate(resolve)); assert.equal(entries()[0].outcome, "unconfirmed"); assert.equal(entries()[0].httpStatus, null);
});
test("ID, action, outcome, area and Lagos date filters are strict, bounded and private", async () => {
  await act(); const e = entries()[0]; e.attemptedAt = "2026-10-07T23:30:00.000Z";
  const r = await request(`/admin/audit?actorId=${ADMIN}&targetId=${TARGET}&category=moderation&action=warn&outcome=succeeded&from=2026-10-08&to=2026-10-08`); assert.equal(r.data.data.pagination.total, 1); assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal((await request("/admin/audit?from=2026-10-07&to=2026-10-07")).data.data.pagination.total, 0);
  for (const q of ["actorId=bad", "targetId=bad", "outcome=invalid", "action=delete", "category=unknown", "targetKind=bad", "from=2026-02-30", "from=2026-10-09&to=2026-10-08", "pageSize=101", "page=1.5", "actorId[]=bad", "password=anything"]) assert.equal((await request(`/admin/audit?${q}`)).status, 400, q);
  assert.equal((await request("/admin/audit?page=999")).data.data.pagination.page, 1);
});
test("append-only audit entries survive per-record history trimming and cannot be edited via API", async () => {
  for (let i = 0; i < 101; i++) assert.equal((await act()).status, 200);
  assert.equal(users.get(TARGET).moderationHistory.length, 100); assert.equal(entries().length, 101);
  const page = await request("/admin/audit?pageSize=10"); assert.equal(page.data.data.entries.length, 10); assert.equal(page.data.data.pagination.totalPages, 11);
  assert.equal((await request(`/admin/audit/${entries()[0]._id}`, { method: "PATCH", body: { note: "Changed" } })).status, 404); assert.equal((await request(`/admin/audit/${entries()[0]._id}`, { method: "DELETE" })).status, 404);
  assert.equal(Audit.schema.path("actorRole").options.immutable, true); assert.equal(Audit.schema.path("attemptedAt").options.immutable, true);
});
test("read failures and missing entries return safe errors", async () => {
  assert.equal((await request("/admin/audit/not-an-id")).status, 400); assert.equal((await request(`/admin/audit/${TARGET}`)).status, 404);
  audit.failRead = true; const r = await request("/admin/audit"); assert.equal(r.status, 500); assert.doesNotMatch(JSON.stringify(r.data), /Private audit read failure/);
});
