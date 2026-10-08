require("./helpers/staffAuditStub").install();
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { io: connect } = createRequire(path.resolve(__dirname, "../../frontend/package.json"))("socket.io-client");
const User = require("../src/models/user.model");
const Vendor = require("../src/models/vendorProfile.model");
const Planner = require("../src/models/plannerProfile.model");
const Ticket = require("../src/models/supportTicket.model");
const supportRoutes = require("../src/routes/support.routes");
const adminRoutes = require("../src/routes/admin.routes");
const authMiddleware = require("../src/middleware/authMiddleware");
const { configureRealtimeAccess } = require("../src/services/realtimeAccess.service");
const service = require("../src/services/support.service");
const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa", ACTOR = "cccccccccccccccccccccccc", OTHER = "dddddddddddddddddddddddd", MOD = "eeeeeeeeeeeeeeeeeeeeeeee", PROFESSIONAL = "ffffffffffffffffffffffff", TID = "111111111111111111111111", PID = "222222222222222222222222";
let MEMBER, users, tickets, profiles, writes, conflict, failure, server, io, base, password, sequence = 0;
const secret = "support-test-secret", previousSecret = process.env.JWT_SECRET, originals = [];
const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
const match = (r, f) => Object.entries(f).every(([k, v]) => (r[k] == null && v == null) || String(r[k]) === String(v));
function stub(model, method, impl) { originals.push([model, method, model[method]]); model[method] = impl; }
function query(get, ticket = false) {
  return { selection: "", offset: 0, size: Infinity,
    select(value) { this.selection = value; return this; }, sort() { return this; }, skip(n) { this.offset = n; return this; }, limit(n) { this.size = n; return this; },
    async exec() {
      if (failure) throw new Error("Private MongoDB details");
      let result = clone(await get());
      if (Array.isArray(result)) result = result.slice(this.offset, this.offset + this.size);
      if (ticket) for (const r of Array.isArray(result) ? result : result ? [result] : []) {
        for (const key of ["priority", "assignedTo", "history"]) if (!this.selection.includes(`+${key}`)) delete r[key];
        if (r.appeal && !this.selection.includes("+appeal.decisionBy")) delete r.appeal.decisionBy;
        for (const key of ["messages", "details"]) if (this.selection.includes(`-${key}`)) delete r[key];
      }
      return result;
    }, lean() { return this.exec(); }, then(resolve, reject) { return this.exec().then(resolve, reject); },
  };
}
before(async () => {
  process.env.JWT_SECRET = secret; password = await bcrypt.hash("correct-password", 4);
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null));
  stub(User, "findOne", (f) => query(() => [...users.values()].find((u) => match(u, f)) || null));
  for (const Model of [Vendor, Planner]) {
    stub(Model, "findOne", (f) => query(() => [...profiles.values()].find((p) => p.type === (Model === Vendor ? "vendor" : "planner") && match(p, f)) || null));
    stub(Model, "findById", (id) => query(() => { const p = profiles.get(String(id)); return p?.type === (Model === Vendor ? "vendor" : "planner") ? p : null; }));
  }
  stub(Ticket, "findOne", (f) => query(() => [...tickets.values()].find((t) => match(t, f)) || null, true));
  stub(Ticket, "findById", (id) => query(() => tickets.get(String(id)) || null, true));
  stub(Ticket, "find", (f) => query(() => [...tickets.values()].filter((t) => match(t, f)), true));
  stub(Ticket, "countDocuments", async (f) => [...tickets.values()].filter((t) => match(t, f)).length);
  stub(Ticket, "create", async (body) => {
    const doc = new Ticket(body); assert.equal(doc.validateSync(), undefined);
    const r = clone(doc.toObject()); r.createdAt = r.updatedAt = new Date().toISOString(); tickets.set(String(r._id), r); writes.push({ create: clone(r) }); return doc;
  });
  stub(Ticket, "findOneAndUpdate", (f, u, options) => query(() => {
    const t = [...tickets.values()].find((r) => match(r, f)); if (!t || conflict) return null;
    assert.equal(options.new, true); assert.equal(options.runValidators, true);
    Object.assign(t, clone(u.$set)); for (const [key, v] of Object.entries(u.$inc)) t[key] = (t[key] || 0) + v;
    for (const [key, v] of Object.entries(u.$push || {})) { if (v.$each) { assert.equal(v.$slice, -100); t[key] = [...(t[key] || []), ...clone(v.$each)].slice(-100); } else (t[key] ||= []).push(clone(v)); }
    assert.equal(new Ticket(t).validateSync(), undefined); writes.push(clone({ f, u })); return t;
  }, true));
  const app = express(); app.use(express.json()); app.use("/support", supportRoutes); app.use("/admin", adminRoutes); app.get("/normal", authMiddleware(), (req, res) => res.json({ success: true }));
  server = http.createServer(app); io = new Server(server, { serveClient: false }); configureRealtimeAccess(io, {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  MEMBER = (++sequence).toString(16).padStart(24, "0");
  users = new Map([[MEMBER, { _id: MEMBER, role: "client", username: "Member", email: "member@example.test", password, accountStatus: "active", authVersion: 0, moderationVersion: 0 }], [ADMIN, { _id: ADMIN, role: "admin", username: "Reviewer", email: "admin@example.test", password }], [ACTOR, { _id: ACTOR, role: "admin", username: "Original reviewer" }], [OTHER, { _id: OTHER, role: "client", username: "Other member" }], [MOD, { _id: MOD, role: "moderator", moderatorPermissions: ["users.read", "reports.manage", "content.manage"] }], [PROFESSIONAL, { _id: PROFESSIONAL, role: "vendor", username: "Vendor", accountStatus: "active" }]]);
  tickets = new Map([[TID, { _id: TID, owner: MEMBER, requestId: randomUUID(), type: "support", category: "technical", subject: "Need assistance", details: "The page is not loading for me.", status: "open", priority: "normal", assignedTo: null, version: 0, messages: [], history: [], createdAt: "2026-10-08T12:00:00Z" }]]);
  profiles = new Map([[PID, { _id: PID, type: "vendor", userId: PROFESSIONAL, active: false, verified: false, verificationStatus: "rejected", verificationVersion: 3, verificationReason: "Identity incomplete", contentReason: "Listing needs correction", contentHistory: [{ by: ACTOR }], verificationHistory: [{ by: ACTOR }] }]]);
  writes = []; conflict = false; failure = false;
});
after(async () => { await new Promise((resolve) => io.close(resolve)); for (const [model, method, original] of originals) model[method] = original; if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
const token = (id = MEMBER, purpose, version = 0) => jwt.sign({ id, role: "admin", authVersion: version, ...(purpose ? { purpose } : {}) }, secret);
async function request(route, { id = MEMBER, auth = token(id), body } = {}) {
  const r = await fetch(`${base}${route}`, { method: body ? "POST" : "GET", headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, data: await r.json(), headers: r.headers };
}
const submission = (extra = {}) => ({ type: "support", category: "technical", subject: "Page loading issue", details: "Please help me load the page.", requestId: randomUUID(), ...extra });
const action = (name, extra = {}, id = ADMIN) => request(`/admin/support/${TID}`, { id, body: { action: name, note: "Private admin assessment", expectedVersion: tickets.get(TID).version, ...extra } });
function appeal(kind = "account") {
  const t = tickets.get(TID); t.type = "appeal";
  if (kind === "account") { Object.assign(users.get(MEMBER), { accountStatus: "banned", moderationReason: "Account decision", moderatedBy: ACTOR, moderationVersion: 2 }); t.appeal = { kind, targetId: MEMBER, targetType: "account", status: "banned", version: 2, reason: "Account decision", decisionBy: ACTOR }; }
  else { t.owner = PROFESSIONAL; t.appeal = { kind, targetId: PID, targetType: "vendor", status: kind === "listing" ? "hidden" : "rejected", version: 3, reason: "Original decision", decisionBy: ACTOR }; }
  return t;
}

test("support sign-in verifies credentials and issues a short session for restricted members", async () => {
  for (const status of ["suspended", "banned", "archived"]) {
    Object.assign(users.get(MEMBER), { accountStatus: status === "archived" ? "banned" : status, archivedAt: status === "archived" ? new Date().toISOString() : null });
    const r = await request("/support/session", { auth: null, body: { email: " MEMBER@example.test ", password: "correct-password" } }); assert.equal(r.status, 200);
    const decoded = jwt.verify(r.data.token, secret); assert.equal(decoded.purpose, "support"); assert.equal(decoded.exp - decoded.iat, 1800);
    assert.equal((await request("/support/me", { auth: r.data.token })).data.data.user.accountStatus, status);
    assert.equal((await request("/support/me")).status, 401);
  }
  const bad = await request("/support/session", { body: { email: "member@example.test", password: "wrong" } });
  const absent = await request("/support/session", { body: { email: "absent@example.test", password: "wrong" } });
  assert.equal(bad.status, 401); assert.deepEqual(bad.data, absent.data);
  assert.equal((await request("/support/session", { body: { email: "admin@example.test", password: "correct-password" } })).status, 401);
});
test("support sessions never authorize normal HTTP or realtime access", async () => {
  const auth = token(MEMBER, "support"); assert.equal((await request("/normal", { auth })).status, 401);
  const socket = connect(base, { auth: { token: auth }, transports: ["websocket"], reconnection: false, autoConnect: false });
  try { const error = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Socket did not reject support token")), 4000); socket.once("connect_error", (e) => { clearTimeout(timer); resolve(e); }); socket.connect(); }); assert.equal(error.data.code, "SESSION_REVOKED"); }
  finally { socket.close(); }
  assert.equal((await request("/normal")).status, 200); assert.equal((await request("/support/me")).status, 200);
});
test("support auth uses current DB role and session revision, including after restoration", async () => {
  for (const auth of [null, "invalid", token(MEMBER, "unknown"), jwt.sign({ id: MEMBER, purpose: "support", exp: 1 }, secret)]) assert.equal((await request("/support/me", { auth })).status, 401);
  for (const id of [ADMIN, MOD]) assert.equal((await request("/support/me", { auth: token(id, "support") })).status, 403);
  const old = token(MEMBER, "support"); users.get(MEMBER).authVersion = 1; assert.equal((await request("/support/me", { auth: old })).status, 401);
  assert.equal((await request("/support/me", { auth: token(MEMBER, "support", 1) })).status, 200);
  users.get(MEMBER).role = "moderator"; assert.equal((await request("/support/me", { auth: token(MEMBER, "support", 1) })).status, 403);
});
test("members only see their own queue, ticket, and restriction snapshots", async () => {
  const t = tickets.get(TID); t.history = [{ note: "SECRET STAFF NOTE" }]; t.assignedTo = ADMIN; t.appeal = { kind: "account", targetId: MEMBER, targetType: "account", decisionBy: ACTOR, reason: "Member reason" };
  t.messages = [{ _id: PID, requestId: randomUUID(), author: ADMIN, from: "admin", text: "Public reply", at: new Date() }];
  for (const route of ["/support/tickets", `/support/tickets/${TID}`]) { const r = await request(route); assert.equal(r.status, 200); assert.equal(r.headers.get("cache-control"), "no-store"); assert.doesNotMatch(JSON.stringify(r.data), /SECRET STAFF NOTE|assignedTo|decisionBy|author|requestId|password|priority/); }
  assert.equal((await request(`/support/tickets/${TID}`, { id: OTHER })).status, 404); assert.equal((await request("/support/tickets", { id: OTHER })).data.data.pagination.total, 0);
  assert.equal((await request("/support/me")).data.data.appealOptions.length, 0);
  const own = await request("/support/me", { id: PROFESSIONAL }); assert.equal(own.data.data.appealOptions.length, 2); assert.doesNotMatch(JSON.stringify(own.data), /decisionBy|History|password/);
});
test("new requests ignore no privileged fields and retry safely without duplicate tickets", async () => {
  const body = submission(); const created = await request("/support/tickets", { body }); assert.equal(created.status, 201);
  assert.equal((await request("/support/tickets", { body })).status, 200); assert.equal(writes.length, 1);
  assert.equal((await request("/support/tickets", { body: { ...body, subject: "Changed submission" } })).status, 409);
  for (const extra of [{ owner: OTHER }, { priority: "urgent" }, { status: "resolved" }, { appeal: { targetId: OTHER } }, { requestId: "bad" }, { details: "short" }]) assert.equal((await request("/support/tickets", { body: submission(extra) })).status, 400);
});
test("appeals capture only a currently eligible owned restriction and its original actor", async () => {
  const u = users.get(MEMBER); Object.assign(u, { accountStatus: "banned", moderatedBy: ACTOR, moderationReason: "Account reason", moderationVersion: 5 });
  const body = submission({ type: "appeal", appealKind: "account", category: "account_access" }); const r = await request("/support/tickets", { auth: token(MEMBER, "support"), body });
  assert.equal(r.status, 201); assert.equal(r.data.data.appeal.version, 5); assert.equal(writes[0].create.appeal.decisionBy, ACTOR); assert.equal(writes[0].create.appeal.targetId, MEMBER); assert.doesNotMatch(JSON.stringify(r.data), /decisionBy/);
  u.accountStatus = "active"; assert.equal((await request("/support/tickets", { body })).status, 200); assert.equal((await request("/support/tickets", { body: { ...body, requestId: randomUUID() } })).status, 409);
  assert.equal((await request("/support/tickets", { body: submission({ type: "appeal", appealKind: "listing" }) })).status, 409);
  for (const kind of ["listing", "verification"]) { const r = await request("/support/tickets", { id: PROFESSIONAL, body: submission({ type: "appeal", appealKind: kind, category: "profile" }) }); assert.equal(r.status, 201); assert.equal(r.data.data.appeal.targetId, PID); }
});
test("member replies are scoped, versioned, idempotent, and return assigned cases to review", async () => {
  Object.assign(tickets.get(TID), { status: "waiting_member", assignedTo: ADMIN }); const body = { text: "The issue happens on mobile.", requestId: randomUUID(), expectedVersion: 0 };
  assert.equal((await request(`/support/tickets/${TID}/replies`, { id: OTHER, body })).status, 404);
  const r = await request(`/support/tickets/${TID}/replies`, { body }); assert.equal(r.status, 200); assert.equal(r.data.data.status, "under_review"); assert.equal(r.data.data.version, 1); assert.doesNotMatch(JSON.stringify(r.data), /assignedTo/);
  assert.equal((await request(`/support/tickets/${TID}/replies`, { body })).status, 200); assert.equal(tickets.get(TID).messages.length, 1);
  assert.equal((await request(`/support/tickets/${TID}/replies`, { body: { ...body, text: "Changed content" } })).status, 409);
  assert.equal((await request(`/support/tickets/${TID}/replies`, { body: { ...body, requestId: randomUUID() } })).status, 409);
});
test("closed, full, and concurrently changed conversations reject new replies", async () => {
  const t = tickets.get(TID), body = { text: "More details", requestId: randomUUID(), expectedVersion: 0 };
  for (const status of ["resolved", "rejected"]) { t.status = status; assert.equal((await request(`/support/tickets/${TID}/replies`, { body })).status, 409); }
  t.status = "open"; t.messages = Array(100).fill({ text: "Past message" }); assert.equal((await request(`/support/tickets/${TID}/replies`, { body })).status, 409);
  t.messages = []; conflict = true; assert.equal((await request(`/support/tickets/${TID}/replies`, { body })).status, 409); assert.equal(writes.length, 0);
});
test("all staff support routes require an admin despite forged role claims or grants", async () => {
  for (const id of [MEMBER, OTHER, MOD]) for (const route of ["/admin/support", `/admin/support/${TID}`]) assert.equal((await request(route, { id })).status, 403);
  assert.equal((await request("/admin/support", { auth: null })).status, 401); assert.equal((await action("claim", {}, MOD)).status, 403);
  assert.equal((await request("/admin/support", { id: ADMIN })).status, 200); assert.equal(writes.length, 0);
});
test("claiming, waiting for information, replies, private notes, and decisions form a review workflow", async () => {
  assert.equal((await action("reply", { message: "Please clarify" })).status, 409);
  assert.equal((await action("claim")).status, 200);
  assert.equal((await action("request_info", { message: "What browser are you using?" })).data.data.status, "waiting_member");
  assert.equal((await action("reply", { message: "We are investigating." })).data.data.status, "under_review");
  assert.equal((await action("note")).status, 200);
  assert.equal((await action("priority", { priority: "urgent" })).data.data.priority, "urgent");
  assert.equal((await action("resolve", { resolution: "The issue has been repaired." })).data.data.outcome, "resolved");
  const member = await request(`/support/tickets/${TID}`); assert.equal(member.data.data.messages.length, 2); assert.equal(member.data.data.resolution, "The issue has been repaired."); assert.doesNotMatch(JSON.stringify(member.data), /Private admin assessment/);
  assert.equal((await action("note")).status, 409); assert.equal((await action("reopen")).data.data.status, "open"); assert.equal(tickets.get(TID).resolution, null);
});
test("another admin must review their own case or their original decision", async () => {
  appeal(); assert.equal((await request(`/admin/support/${TID}`, { id: ACTOR })).data.data.canReview, false); assert.equal((await action("claim", {}, ACTOR)).status, 403);
  assert.equal((await action("claim")).status, 200); assert.equal((await action("accept", { resolution: "Restored", expectedTargetVersion: 2 }, ACTOR)).status, 403);
  tickets.get(TID).owner = ADMIN; assert.equal((await action("note")).status, 403);
});
test("a different reviewer cannot alter a claimed case but can release it with a reason", async () => {
  assert.equal((await action("claim")).status, 200); assert.equal((await action("note", {}, ACTOR)).status, 409);
  assert.equal((await action("release", {}, ACTOR)).status, 200); assert.equal(tickets.get(TID).assignedTo, null); assert.equal((await action("claim", {}, ACTOR)).status, 200);
});
for (const kind of ["account", "listing", "verification"]) test(`${kind} appeals cannot be accepted until restoration and a current target revision`, async () => {
  const t = appeal(kind); assert.equal((await action("claim")).status, 200);
  assert.equal((await action("resolve", { resolution: "Done" })).status, 409);
  assert.equal((await action("accept", { resolution: "Restored", expectedTargetVersion: t.appeal.version })).status, 409);
  if (kind === "account") { const user = users.get(MEMBER); user.accountStatus = "active"; user.archivedAt = new Date().toISOString(); assert.equal((await action("accept", { resolution: "Restored", expectedTargetVersion: 2 })).status, 409); user.archivedAt = null; user.moderationVersion = 3; }
  else { const p = profiles.get(PID); if (kind === "listing") p.active = true; else p.verified = true; p.verificationVersion = 4; }
  assert.equal((await action("accept", { resolution: "Restored", expectedTargetVersion: t.appeal.version })).status, 409);
  const r = await action("accept", { resolution: "Access has been restored.", expectedTargetVersion: kind === "account" ? 3 : 4 }); assert.equal(r.status, 200); assert.equal(r.data.data.outcome, "accepted"); assert.equal(writes.length, 2);
});
test("missing or reassigned appeal targets cannot be accepted; rejection records a public explanation", async () => {
  appeal("listing"); assert.equal((await action("claim")).status, 200); profiles.get(PID).userId = OTHER;
  const r = await request(`/admin/support/${TID}`, { id: ADMIN }); assert.equal(r.data.data.currentAppeal.missing, true);
  assert.equal((await action("accept", { resolution: "Done", expectedTargetVersion: 3 })).status, 409);
  assert.equal((await action("reject", { resolution: "The restriction remains justified." })).data.data.outcome, "rejected");
});
test("review writes reject malformed fields and stale versions and retain bounded private history", async () => {
  for (const body of [{ action: "unknown" }, { note: "" }, { expectedVersion: -1 }, { owner: OTHER }, { action: "reply" }, { action: "resolve" }, { priority: "urgent" }]) assert.equal((await action("claim", body)).status, 400);
  assert.equal((await action("claim", { expectedVersion: 2 })).status, 409); conflict = true; assert.equal((await action("claim")).status, 409); conflict = false;
  const t = tickets.get(TID); t.history = Array.from({ length: 100 }, () => ({ _id: String(new mongoose.Types.ObjectId()), action: "note", by: ACTOR, note: "Previous", at: new Date() }));
  assert.equal((await action("claim")).status, 200); assert.equal(t.history.length, 100); assert.equal(t.history.at(-1).action, "claim");
});
test("strict filters constrain member data and correctly filter the admin queue", async () => {
  for (const q of ["owner=other", "status=invalid", "page=0", "pageSize=101", "status[]=open"]) assert.equal((await request(`/support/tickets?${q}`)).status, 400);
  assert.equal((await request("/support/tickets?page=999")).data.data.pagination.page, 1);
  assert.equal((await request("/admin/support?assigned=unassigned", { id: ADMIN })).data.data.pagination.total, 1);
  assert.equal((await request("/admin/support?assigned=mine", { id: ADMIN })).data.data.pagination.total, 0);
  await action("claim"); assert.equal((await request("/admin/support?assigned=mine", { id: ADMIN })).data.data.pagination.total, 1);
  assert.equal(service.parseQuery({ page: "1.5" }, true), null);
});
test("submission throttling is per member and does not affect another account", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request("/support/tickets", { body: submission() })).status, 201);
  assert.equal((await request("/support/tickets", { body: submission() })).status, 429);
  assert.equal((await request("/support/tickets", { id: OTHER, body: submission() })).status, 201);
});
test("database failures do not expose implementation details", async () => {
  failure = true; const r = await request("/support/tickets", { body: submission() }); assert.equal(r.status, 401); assert.doesNotMatch(JSON.stringify(r.data), /MongoDB|Private/);
  failure = false; const original = Ticket.create; Ticket.create = async () => { throw new Error("Private MongoDB details"); };
  try { const r = await request("/support/tickets", { body: submission() }); assert.equal(r.status, 500); assert.doesNotMatch(JSON.stringify(r.data), /MongoDB|Private/); } finally { Ticket.create = original; }
});
