require("./helpers/staffAuditStub").install();
require("./helpers/platformSettingsStub").install();
const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const { io: connect } = createRequire(path.resolve(__dirname, "../../frontend/package.json"))("socket.io-client");
const User = require("../src/models/user.model");
const adminRoutes = require("../src/routes/admin.routes");
const authRoutes = require("../src/routes/auth.routes");
const eventRoutes = require("../src/routes/events.routes");
const { configureRealtimeAccess } = require("../src/services/realtimeAccess.service");
const { accountStatus, currentWarning } = require("../src/services/accountAccess.service");
const { parseUserQuery } = require("../src/services/adminUsers.service");

const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa";
const TARGET = "bbbbbbbbbbbbbbbbbbbbbbbb";
const SECOND_ADMIN = "cccccccccccccccccccccccc";
const secret = "moderation-tests-only-secret";
const oldSecret = process.env.JWT_SECRET;
const originalMethods = { findById: User.findById, findOne: User.findOne, update: User.findOneAndUpdate };
let server;
let io;
let base;
let documents;
let clients;
let connected;
let updates;
let failWrites;
let forceConflict;
let promoteDuringWrite;
let password;
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
function query(getValue) {
  return { select() { return this; }, lean: async () => clone(await getValue()), then: (resolve, reject) => Promise.resolve().then(getValue).then(resolve, reject) };
}

before(async () => {
  process.env.JWT_SECRET = secret;
  password = await bcrypt.hash("test-password", 4);
  User.findById = (id) => query(() => documents.get(String(id)) || null);
  User.findOne = (filter) => query(() => [...documents.values()].find((item) => item.email === filter.email) || null);
  User.findOneAndUpdate = (filter, update, options) => query(() => {
    if (failWrites) throw new Error("Private database failure");
    const user = documents.get(String(filter._id));
    if (!user) return null;
    if (filter["lastWarning.id"]) {
      if (user.lastWarning?.id !== filter["lastWarning.id"]) return null;
      user.lastWarning.acknowledgedAt = update.$set["lastWarning.acknowledgedAt"];
      return user;
    }
    if (promoteDuringWrite) user.role = "admin";
    if (forceConflict) user.moderationVersion = 1;
    if (typeof filter.role === "string" ? filter.role !== user.role : !filter.role.$in.includes(user.role)) return null;
    if (filter.archivedAt === null && user.archivedAt != null) return null;
    if (filter.archivedAt != null && new Date(filter.archivedAt).getTime() !== new Date(user.archivedAt).getTime()) return null;
    const expected = filter.moderationVersion ?? 0;
    if ((user.moderationVersion ?? 0) !== expected) return null;
    assert.equal(options.new, true);
    assert.equal(options.runValidators, true);
    if (Object.hasOwn(filter, "accountStatus") && (user.accountStatus ?? null) !== filter.accountStatus) return null;
    if (Object.hasOwn(filter, "suspendedUntil") && (user.suspendedUntil ?? null) !== (filter.suspendedUntil == null ? null : new Date(filter.suspendedUntil).toISOString())) return null;
    if (Object.hasOwn(filter, "staffMemberRole") && user.staffMemberRole !== filter.staffMemberRole) return null;
    const historyKey = update.$push.staffHistory ? "staffHistory" : "moderationHistory";
    assert.equal(update.$push[historyKey].$slice, -100);
    updates.push({ filter, update });
    Object.assign(user, clone(update.$set));
    for (const [key, value] of Object.entries(update.$inc)) user[key] = (user[key] ?? 0) + value;
    user[historyKey] = [...(user[historyKey] || []), ...clone(update.$push[historyKey].$each)].slice(-100);
    return user;
  });
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventRoutes);
  server = http.createServer(app);
  io = new Server(server, { serveClient: false });
  connected = {};
  configureRealtimeAccess(io, connected);
  io.on("connection", (socket) => socket.on("probe", (data, ack) => ack("accepted")));
  app.set("io", io);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  documents = new Map([
    [ADMIN, { _id: ADMIN, role: "admin", email: "staff@example.com", password }],
    [SECOND_ADMIN, { _id: SECOND_ADMIN, role: "admin", email: "other-staff@example.com", password }],
    [TARGET, { _id: TARGET, username: "Member", role: "planner", email: "member@example.com", password, phone: "123", moderationVersion: 0, authVersion: 0, accountStatus: "active", moderationHistory: [] }],
  ]);
  clients = [];
  updates = [];
  failWrites = false;
  forceConflict = false;
  promoteDuringWrite = false;
});
afterEach(() => { for (const client of clients) client.disconnect(); });
after(async () => {
  await new Promise((resolve) => io.close(resolve));
  User.findById = originalMethods.findById;
  User.findOne = originalMethods.findOne;
  User.findOneAndUpdate = originalMethods.update;
  if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
});

function token(id = TARGET, authVersion = 0) { return jwt.sign({ id, role: "admin", authVersion }, secret); }
async function request(endpoint, { body, auth, method } = {}) {
  const response = await fetch(`${base}/api${endpoint}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
const moderate = (body, id = TARGET, auth = token(ADMIN)) => request(`/admin/users/${id}/moderation`, { body: { action: "warn", reason: "Policy violation", expectedVersion: 0, ...body }, auth });
const me = (auth = token()) => request("/auth/me", { auth });
const login = (email = "member@example.com", inputPassword = "test-password") => request("/auth/login", { body: { email, password: inputPassword } });
const archive = (body = {}, id = TARGET, auth = token(ADMIN)) => request(`/admin/users/${id}/archive`, { body: { action: "archive", reason: "Removed after review", expectedVersion: 0, ...body }, auth });
const staffChange = (body = {}, id = TARGET, auth = token(ADMIN)) => request(`/admin/users/${id}/staff`, { body: { action: "appoint", permissions: ["users.read", "users.warn"], reason: "Trusted community staff", expectedVersion: 0, ...body }, auth });
function waitEvent(emitter, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 3000);
    emitter.once(name, (...args) => { clearTimeout(timer); resolve(args[0]); });
  });
}
async function waitReady(client) {
  const deadline = Date.now() + 3000;
  while (connected[TARGET]?.socketId !== client.id) {
    if (Date.now() > deadline) throw new Error("Realtime readiness timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
function socket(auth = token()) {
  const client = connect(base, { autoConnect: false, reconnection: false, transports: ["websocket"], auth: { token: auth } });
  clients.push(client);
  return client;
}

test("admin appointment preserves identity, records, member role, and requires a fresh moderator login", async () => {
  const user = documents.get(TARGET);
  user.profile = "dddddddddddddddddddddddd";
  const original = clone(user);
  const result = await staffChange();
  assert.equal(result.status, 200);
  assert.equal(user.role, "moderator");
  assert.equal(user.staffMemberRole, "planner");
  assert.deepEqual(user.moderatorPermissions, ["users.read", "users.warn"]);
  for (const key of ["_id", "profile", "email", "password", "phone", "accountStatus", "moderationHistory"]) assert.deepEqual(user[key], original[key]);
  assert.equal(user.staffHistory[0].action, "appoint");
  assert.equal(user.staffHistory[0].by, ADMIN);
  assert.equal(user.staffHistory[0].reason, "Trusted community staff");
  assert.equal(user.moderationVersion, 1);
  assert.equal((await me()).body.code, "SESSION_REVOKED");
  const fresh = await login();
  assert.equal(fresh.status, 200);
  assert.equal(fresh.body.user.role, "moderator");
  assert.deepEqual(fresh.body.user.permissions, ["users.read", "users.warn"]);
  assert.deepEqual((await me(fresh.body.token)).body.user.permissions, fresh.body.user.permissions);
  assert.ok(!JSON.stringify(result.body).includes(password));
});

test("staff permission updates and revocation invalidate sessions and restore the original role", async () => {
  await staffChange();
  const originalSession = (await login()).body.token;
  assert.equal((await staffChange({ action: "update", expectedVersion: 1, permissions: ["users.read", "users.suspend"] })).status, 200);
  assert.equal((await me(originalSession)).body.code, "SESSION_REVOKED");
  const moderatorSession = (await login()).body.token;
  const result = await staffChange({ action: "revoke", expectedVersion: 2, permissions: undefined, reason: "Duty completed" });
  assert.equal(result.status, 200);
  const user = documents.get(TARGET);
  assert.equal(user.role, "planner");
  assert.equal(user.staffMemberRole, null);
  assert.deepEqual(user.moderatorPermissions, []);
  assert.equal(user.staffHistory.at(-1).action, "revoke");
  assert.equal((await me(moderatorSession)).body.code, "SESSION_REVOKED");
  const fresh = await login();
  assert.equal(fresh.body.user.role, "planner");
  assert.deepEqual(fresh.body.user.permissions, []);
  assert.equal((await request("/admin/users", { auth: fresh.body.token })).status, 403);
});

test("moderators can only perform assigned member moderation actions", async () => {
  const actor = documents.get(SECOND_ADMIN);
  actor.role = "moderator";
  actor.moderatorPermissions = ["users.read", "users.warn"];
  const auth = token(SECOND_ADMIN);
  assert.equal((await moderate({}, TARGET, auth)).status, 200);
  assert.equal(documents.get(TARGET).moderationHistory.at(-1).by, SECOND_ADMIN);
  assert.equal((await moderate({ action: "suspend", durationHours: 1, expectedVersion: 1 }, TARGET, auth)).status, 403);
  actor.moderatorPermissions.push("users.suspend");
  assert.equal((await moderate({ action: "suspend", durationHours: 1, expectedVersion: 1 }, TARGET, auth)).status, 200);
  assert.equal((await moderate({ action: "restore", expectedVersion: 2 }, TARGET, auth)).status, 403);
  actor.moderatorPermissions.push("users.restore");
  assert.equal((await moderate({ action: "restore", expectedVersion: 2 }, TARGET, auth)).status, 200);
  assert.equal((await moderate({ action: "ban", expectedVersion: 3 }, TARGET, auth)).status, 403);
  actor.moderatorPermissions.push("users.ban");
  assert.equal((await moderate({ action: "ban", expectedVersion: 3 }, TARGET, auth)).status, 200);
  actor.moderatorPermissions = ["users.warn"];
  assert.equal((await moderate({}, TARGET, auth)).status, 403);
});

test("moderators cannot appoint staff, archive accounts, access staff records, or moderate each other", async () => {
  await staffChange();
  const fresh = (await login()).body.token;
  assert.equal((await staffChange({}, SECOND_ADMIN, fresh)).status, 403);
  assert.equal((await archive({}, SECOND_ADMIN, fresh)).status, 403);
  for (const endpoint of ["/admin/overview", "/admin/archive", "/admin/users?role=admin", "/admin/users?role=moderator", `/admin/users/${SECOND_ADMIN}`]) assert.equal((await request(endpoint, { auth: fresh })).status, 403);
  assert.equal((await moderate({ action: "ban", expectedVersion: 1 })).status, 403);
  assert.equal((await archive({ expectedVersion: 1 })).status, 403);
});

test("staff requests reject unknown permissions, duplicate grants, injected roles, and protected targets", async () => {
  for (const body of [{ permissions: [] }, { permissions: ["users.warn"] }, { permissions: ["users.read", "admin"] }, { permissions: ["users.read", "users.read"] }, { permissions: "users.read" }, { role: "admin" }, { action: "promote-admin" }, { reason: " " }, { reason: "x".repeat(1001) }, { expectedVersion: "0" }, { action: "revoke" }]) assert.equal((await staffChange(body)).status, 400);
  assert.equal((await staffChange({}, "bad-id")).status, 400);
  assert.equal((await staffChange({}, ADMIN)).status, 403);
  assert.equal((await staffChange({}, SECOND_ADMIN)).status, 403);
  assert.equal((await staffChange({}, TARGET, null)).status, 401);
  assert.equal((await staffChange({}, TARGET, token())).status, 403);
  assert.equal(updates.length, 0);
});

test("report management grants require report reading permission", async () => {
  assert.equal((await staffChange({ permissions: ["users.read", "reports.manage"] })).status, 400);
  const result = await staffChange({ permissions: ["users.read", "reports.read", "reports.manage"] });
  assert.equal(result.status, 200);
  assert.deepEqual(documents.get(TARGET).moderatorPermissions, ["users.read", "reports.read", "reports.manage"]);
});

test("content management grants require content reading permission", async () => {
  assert.equal((await staffChange({ permissions: ["users.read", "content.manage"] })).status, 400);
  const result = await staffChange({ permissions: ["users.read", "content.read", "content.manage"] });
  assert.equal(result.status, 200);
  assert.deepEqual(documents.get(TARGET).moderatorPermissions, ["users.read", "content.read", "content.manage"]);
});

test("staff appointments reject restricted, archived, stale, and concurrently promoted targets", async () => {
  const user = documents.get(TARGET);
  for (const status of ["banned", "suspended"]) {
    user.accountStatus = status;
    user.suspendedUntil = new Date(Date.now() + 3600000).toISOString();
    assert.equal((await staffChange()).status, 409);
  }
  user.accountStatus = "active";
  user.archivedAt = new Date().toISOString();
  assert.equal((await staffChange()).status, 409);
  user.archivedAt = null;
  assert.equal((await staffChange({ expectedVersion: 1 })).status, 409);
  forceConflict = true;
  assert.equal((await staffChange()).status, 409);
  forceConflict = false;
  user.moderationVersion = 0;
  promoteDuringWrite = true;
  assert.equal((await staffChange()).status, 409);
  assert.equal(updates.length, 0);
});

test("failed staff writes preserve state and hide database details", async () => {
  const before = clone(documents.get(TARGET));
  failWrites = true;
  const result = await staffChange();
  assert.equal(result.status, 500);
  assert.deepEqual(documents.get(TARGET), before);
  assert.ok(!JSON.stringify(result.body).includes("Private database"));
});

test("staff changes disconnect open tabs and old staff tokens cannot reconnect", async () => {
  const first = socket(); const second = socket();
  const readyFirst = waitEvent(first, "connect"); first.connect(); await readyFirst; await waitReady(first);
  const readySecond = waitEvent(second, "connect"); second.connect(); await readySecond; await waitReady(second);
  const firstDisconnected = waitEvent(first, "disconnect"); const secondDisconnected = waitEvent(second, "disconnect");
  const changed = waitEvent(first, "account_restricted");
  assert.equal((await staffChange()).status, 200);
  assert.equal((await changed).code, "SESSION_REVOKED");
  await Promise.all([firstDisconnected, secondDisconnected]);
  const reconnect = socket(); const denied = waitEvent(reconnect, "connect_error"); reconnect.connect();
  assert.equal((await denied).data.code, "SESSION_REVOKED");
});

test("legacy moderator records fail closed and staff history is bounded", async () => {
  const user = documents.get(TARGET);
  user.role = "moderator";
  assert.equal((await request("/admin/users", { auth: token() })).status, 403);
  assert.equal((await staffChange({ action: "update" })).status, 409);
  user.staffMemberRole = "planner";
  user.staffHistory = Array.from({ length: 100 }, () => ({ action: "update", reason: "Earlier decision", permissions: ["users.read"], memberRole: "planner", at: new Date().toISOString(), by: ADMIN }));
  assert.equal((await staffChange({ action: "update", permissions: ["users.read"] })).status, 200);
  assert.equal(user.staffHistory.length, 100);
  assert.equal(user.staffHistory.at(-1).reason, "Trusted community staff");
});

test("warnings persist with actor/reason/history, preserve access, and appear in login and /me", async () => {
  const result = await moderate({});
  assert.equal(result.status, 200);
  const user = documents.get(TARGET);
  assert.equal(user.authVersion, 0);
  assert.equal(user.moderationVersion, 1);
  assert.equal(result.body.data.status, "active");
  assert.equal(result.body.data.history[0].by, ADMIN);
  assert.equal(result.body.data.history[0].reason, "Policy violation");
  assert.deepEqual((await me()).body.user.warning, currentWarning(user));
  const response = await login();
  assert.equal(response.status, 200);
  assert.equal(response.body.user.warning.reason, "Policy violation");
  assert.equal(jwt.verify(response.body.token, secret).authVersion, 0);
});

test("only the account owner can acknowledge the current warning; repeat acknowledgement is harmless", async () => {
  await moderate({});
  const id = documents.get(TARGET).lastWarning.id;
  const endpoint = `/auth/warnings/${id}/acknowledge`;
  assert.equal((await request(endpoint, { method: "POST", auth: token(SECOND_ADMIN) })).status, 404);
  assert.equal((await request(endpoint, { method: "POST", auth: token() })).status, 204);
  assert.equal((await request(endpoint, { method: "POST", auth: token() })).status, 204);
  assert.equal((await me()).body.user.warning, null);
  assert.equal(documents.get(TARGET).moderationHistory.length, 1);
  assert.equal((await request(`/auth/warnings/${randomUUID()}/acknowledge`, { method: "POST", auth: token() })).status, 404);
});

test("suspension denies correct-password login and existing tokens, then restores automatically without resurrecting old tokens", async () => {
  const result = await moderate({ action: "suspend", durationHours: 24 });
  assert.equal(result.status, 200);
  const user = documents.get(TARGET);
  assert.equal(user.authVersion, 1);
  assert.ok(new Date(user.suspendedUntil) - Date.now() > 23 * 3600000);
  assert.equal((await me()).body.code, "ACCOUNT_SUSPENDED");
  assert.equal((await login()).body.code, "ACCOUNT_SUSPENDED");
  assert.equal((await login(undefined, "wrong-password")).status, 400);
  user.suspendedUntil = new Date(Date.now() - 1000).toISOString();
  assert.equal(accountStatus(user), "active");
  assert.equal((await me()).body.code, "SESSION_REVOKED");
  const fresh = await login();
  assert.equal(fresh.status, 200);
  assert.equal((await me(fresh.body.token)).status, 200);
});

test("bans block access indefinitely and explicit restoration requires a fresh login", async () => {
  await moderate({ action: "ban" });
  assert.equal((await login()).body.code, "ACCOUNT_BANNED");
  assert.equal((await me()).status, 403);
  const restored = await moderate({ action: "restore", reason: "Appeal accepted", expectedVersion: 1 });
  assert.equal(restored.status, 200);
  assert.equal(restored.body.data.status, "active");
  assert.equal(restored.body.data.history[0].action, "restore");
  assert.equal(documents.get(TARGET).authVersion, 2);
  assert.equal((await me()).status, 401);
  assert.equal((await me((await login()).body.token)).status, 200);
});

test("guest, non-admin, self, and staff-target moderation is denied without changes", async () => {
  assert.equal((await request(`/admin/users/${TARGET}/moderation`, { body: { action: "ban", reason: "Policy", expectedVersion: 1 } })).status, 401);
  assert.equal((await moderate({}, TARGET, token())).status, 403);
  assert.equal((await moderate({}, ADMIN)).status, 403);
  assert.equal((await moderate({}, SECOND_ADMIN)).status, 403);
  assert.equal(updates.length, 0);
});

test("invalid actions, missing reasons, duration bounds, and injected fields do not mutate accounts", async () => {
  for (const body of [{ action: "delete" }, { reason: "   " }, { reason: "x".repeat(1001) }, { reason: {} }, { expectedVersion: -1 }, { expectedVersion: "0" }, { expectedVersion: undefined }, { action: "suspend" }, { action: "suspend", durationHours: 0 }, { action: "suspend", durationHours: 2161 }, { action: "suspend", durationHours: 1.5 }, { durationHours: 24 }, { role: "admin" }, { accountStatus: "active" }]) assert.equal((await moderate(body)).status, 400);
  assert.equal((await moderate({}, "invalid")).status, 400);
  assert.equal(updates.length, 0);
});

test("version conflicts, simultaneous changes, and staff promotions cannot overwrite account state", async () => {
  assert.equal((await moderate({ expectedVersion: 9 })).status, 409);
  forceConflict = true;
  assert.equal((await moderate({ action: "ban" })).status, 409);
  assert.equal(documents.get(TARGET).accountStatus, "active");
  forceConflict = false;
  documents.get(TARGET).moderationVersion = 0;
  promoteDuringWrite = true;
  assert.equal((await moderate({ action: "ban" })).status, 409);
  assert.equal(updates.length, 0);
});

test("unsupported transitions are rejected and moderation history retains the latest 100 actions", async () => {
  assert.equal((await moderate({ action: "restore" })).status, 409);
  await moderate({ action: "ban" });
  assert.equal((await moderate({ action: "warn", expectedVersion: 1 })).status, 409);
  assert.equal((await moderate({ action: "suspend", durationHours: 1, expectedVersion: 1 })).status, 409);
  assert.equal((await moderate({ action: "ban", expectedVersion: 1 })).status, 409);
  const user = documents.get(TARGET);
  user.moderationHistory = Array.from({ length: 100 }, (_, index) => ({ _id: String(index), action: "warn", reason: "Past action", by: ADMIN, at: "2026-01-01T00:00Z" }));
  await moderate({ action: "restore", expectedVersion: 1 });
  assert.equal(user.moderationHistory.length, 100);
  assert.equal(user.moderationHistory[0]._id, "1");
  assert.equal(user.moderationHistory.at(-1).action, "restore");
});

test("legacy accounts and tokens remain usable until a restriction revokes them", async () => {
  const user = documents.get(TARGET);
  delete user.authVersion;
  delete user.accountStatus;
  delete user.moderationVersion;
  const legacy = jwt.sign({ id: TARGET }, secret);
  assert.equal((await me(legacy)).status, 200);
  assert.equal((await moderate({ action: "ban" })).status, 200);
  await moderate({ action: "restore", expectedVersion: 1 });
  assert.equal((await me(legacy)).body.code, "SESSION_REVOKED");
});

test("status filters include expired suspensions as active and preserve other filters", () => {
  const active = parseUserQuery({ status: "active", role: "planner", search: "Alice" });
  assert.equal(active.filter.role, "planner");
  assert.equal(active.filter.$or.length, 3);
  assert.equal(active.filter.$and[0].$or[1].accountStatus, "suspended");
  assert.ok(active.filter.$and[0].$or[1].suspendedUntil.$lte instanceof Date);
  assert.equal(parseUserQuery({ status: "suspended" }).filter.accountStatus, "suspended");
  assert.equal(parseUserQuery({ status: "banned" }).filter.accountStatus, "banned");
  assert.equal(parseUserQuery({ status: "unknown" }), null);
});

test("unprotected event creation cannot bypass suspension or operate anonymously", async () => {
  assert.equal((await request("/events", { body: { title: "Test" } })).status, 401);
  await moderate({ action: "ban" });
  assert.equal((await request("/events", { body: { title: "Test" }, auth: token() })).body.code, "ACCOUNT_BANNED");
});

test("database failures do not apply partial moderation or expose internals", async () => {
  failWrites = true;
  const result = await moderate({ action: "ban" });
  assert.equal(result.status, 500);
  assert.equal(result.body.message, "Unable to update account moderation.");
  assert.equal(documents.get(TARGET).accountStatus, "active");
  assert.equal(documents.get(TARGET).moderationHistory.length, 0);
});

test("warnings are delivered to active sockets without disconnecting them", async () => {
  const client = socket();
  const ready = waitEvent(client, "connect");
  client.connect();
  await ready;
  await waitReady(client);
  const warned = waitEvent(client, "account_warning");
  await moderate({});
  const payload = await warned;
  assert.equal(payload.warning.reason, "Policy violation");
  assert.equal(client.connected, true);
});

test("a ban disconnects every active tab and rejects reconnecting tokens", async () => {
  const tabs = [socket(), socket()];
  for (const client of tabs) { const ready = waitEvent(client, "connect"); client.connect(); await ready; await waitReady(client); }
  const restricted = tabs.map((client) => waitEvent(client, "account_restricted"));
  const disconnected = tabs.map((client) => waitEvent(client, "disconnect"));
  assert.equal((await moderate({ action: "ban" })).status, 200);
  assert.ok((await Promise.all(restricted)).every((payload) => payload.code === "ACCOUNT_BANNED"));
  await Promise.all(disconnected);
  assert.ok(tabs.every((client) => !client.connected));
  const reconnect = socket();
  const rejected = waitEvent(reconnect, "connect_error");
  reconnect.connect();
  assert.equal((await rejected).data.code, "ACCOUNT_BANNED");
  await moderate({ action: "restore", expectedVersion: 1, reason: "Appeal accepted" });
  const stale = socket();
  const staleError = waitEvent(stale, "connect_error");
  stale.connect();
  assert.equal((await staleError).data.code, "SESSION_REVOKED");
});

test("socket packet guards revoke access when account state changes outside the admin broadcaster", async () => {
  const client = socket();
  const ready = waitEvent(client, "connect"); client.connect(); await ready; await waitReady(client);
  assert.equal(await new Promise((resolve) => client.emit("probe", "test", resolve)), "accepted");
  documents.get(TARGET).accountStatus = "banned";
  const disconnected = waitEvent(client, "disconnect");
  let accepted = false;
  client.emit("probe", "test", () => { accepted = true; });
  await disconnected;
  assert.equal(accepted, false);
});

test("moderation racing the socket handshake is caught by the connection recheck", async (t) => {
  let reads = 0;
  t.mock.method(User, "findById", (id) => query(() => {
    const snapshot = clone(documents.get(String(id)));
    if (String(id) === TARGET && ++reads === 1) documents.get(TARGET).accountStatus = "banned";
    return snapshot;
  }));
  const client = socket();
  const restricted = waitEvent(client, "account_restricted");
  const disconnected = waitEvent(client, "disconnect");
  client.connect();
  assert.equal((await restricted).code, "ACCOUNT_BANNED");
  await disconnected;
  assert.equal(client.connected, false);
});

test("public signup cannot supply ownership, moderation, archive or staff metadata, or session versions", async (t) => {
  let registered;
  t.mock.method(User.prototype, "save", async function () { registered = this.toObject(); return this; });
  const result = await request("/auth/register", { body: { username: "New vendor", email: "new@example.com", phone: "123", password: "test-password", role: "vendor", isSiteOwner: true, accountStatus: "banned", authVersion: 99, moderationVersion: 99, lastWarning: { reason: "Injected" }, archivedAt: new Date().toISOString(), archivedBy: ADMIN, archiveReason: "Injected", moderatorPermissions: ["users.read", "users.ban"], staffMemberRole: "client", staffHistory: [{ action: "appoint" }] } });
  assert.equal(result.status, 201);
  assert.equal(registered.accountStatus, "active");
  assert.equal(registered.isSiteOwner, false);
  assert.equal(registered.authVersion, 0);
  assert.equal(registered.moderationVersion, 0);
  assert.equal(registered.lastWarning.reason, undefined);
  assert.equal(registered.archivedAt, null);
  assert.equal(registered.archivedBy, null);
  assert.equal(registered.archiveReason, null);
  assert.deepEqual(registered.moderatorPermissions, []);
  assert.equal(registered.staffMemberRole, null);
  assert.deepEqual(registered.staffHistory, []);
});

test("archiving preserves account identity and records, blocks access, and reserves its email", async () => {
  const user = documents.get(TARGET);
  user.profile = "dddddddddddddddddddddddd";
  user.lastWarning = { id: randomUUID(), reason: "Existing warning" };
  const before = clone(user);
  const result = await archive();
  assert.equal(result.status, 200);
  assert.equal(result.body.data.status, "archived");
  for (const key of ["_id", "username", "email", "phone", "password", "role", "profile", "lastWarning", "accountStatus"]) assert.deepEqual(user[key], before[key]);
  assert.equal(user.archivedBy, ADMIN);
  assert.equal(user.archiveReason, "Removed after review");
  assert.ok(user.archivedAt);
  assert.equal(user.moderationHistory.at(-1).action, "archive");
  assert.equal(user.authVersion, 1);
  assert.equal((await me()).body.code, "ACCOUNT_ARCHIVED");
  assert.equal((await login()).body.code, "ACCOUNT_ARCHIVED");
  const incorrect = await login(undefined, "incorrect");
  assert.equal(incorrect.status, 400);
  assert.equal(incorrect.body.code, undefined);
  const duplicate = await request("/auth/register", { body: { username: "Duplicate", email: user.email, phone: "123", password: "test-password", role: "client" } });
  assert.equal(duplicate.status, 400);
  assert.ok(!JSON.stringify(result.body).includes(password));
});

test("restoring an archive retains previous restrictions and revokes all earlier tokens", async () => {
  for (const status of ["active", "banned", "suspended"]) {
    const user = documents.get(TARGET);
    user.accountStatus = status;
    user.suspendedUntil = status === "suspended" ? new Date(Date.now() + 3600000).toISOString() : null;
    user.moderationReason = status === "active" ? null : "Previous restriction";
    const version = user.moderationVersion;
    const oldToken = token(TARGET, user.authVersion);
    assert.equal((await archive({ expectedVersion: version })).status, 200);
    assert.equal((await archive({ action: "unarchive", expectedVersion: version + 1, reason: "Appeal accepted" })).status, 200);
    assert.equal(user.archivedAt, null);
    assert.equal(user.accountStatus, status);
    assert.equal(accountStatus(user), status);
    assert.equal(user.moderationHistory.at(-1).action, "unarchive");
    if (status === "active") {
      assert.equal((await me(oldToken)).body.code, "SESSION_REVOKED");
      const result = await login();
      assert.equal(result.status, 200);
      assert.equal((await me(result.body.token)).status, 200);
    } else assert.equal((await login()).body.code, status === "banned" ? "ACCOUNT_BANNED" : "ACCOUNT_SUSPENDED");
  }
});

test("archive endpoints protect staff, self, and guest access using the database role", async () => {
  assert.equal((await archive({}, TARGET, null)).status, 401);
  assert.equal((await archive({}, TARGET, token())).status, 403);
  assert.equal((await archive({}, ADMIN)).status, 403);
  assert.equal((await archive({}, SECOND_ADMIN)).status, 403);
  assert.equal((await archive({}, "dddddddddddddddddddddddd")).status, 404);
  assert.equal(updates.length, 0);
});

test("archive actions validate input and reject stale changes and protected role races", async () => {
  for (const body of [{ action: "delete" }, { reason: " " }, { reason: "x".repeat(1001) }, { expectedVersion: "0" }, { expectedVersion: -1 }, { role: "admin" }, { archivedAt: new Date() }]) assert.equal((await archive(body)).status, 400);
  assert.equal((await archive({}, "bad-id")).status, 400);
  assert.equal((await archive({ action: "unarchive" })).status, 409);
  forceConflict = true;
  assert.equal((await archive()).status, 409);
  forceConflict = false;
  documents.get(TARGET).moderationVersion = 0;
  promoteDuringWrite = true;
  assert.equal((await archive()).status, 409);
  assert.equal(updates.length, 0);
});

test("archive and moderation share a version; archived accounts cannot bypass restoration", async () => {
  await moderate({});
  assert.equal((await archive()).status, 409);
  assert.equal((await archive({ expectedVersion: 1 })).status, 200);
  assert.equal((await archive({ expectedVersion: 2 })).status, 409);
  for (const action of ["warn", "suspend", "ban", "restore"]) assert.equal((await moderate({ action, expectedVersion: 2, ...(action === "suspend" ? { durationHours: 1 } : {}) })).status, 409);
  assert.equal((await archive({ action: "unarchive", expectedVersion: 2 })).status, 200);
  assert.equal((await moderate({ action: "ban", expectedVersion: 2 })).status, 409);
});

test("archive database failure leaves account state untouched and hides private errors", async () => {
  const before = clone(documents.get(TARGET));
  failWrites = true;
  const result = await archive();
  assert.equal(result.status, 500);
  assert.deepEqual(documents.get(TARGET), before);
  assert.ok(!JSON.stringify(result.body).includes("Private database"));
});

test("archiving disconnects both tabs, refuses reconnect, and does not revive tokens after restoration", async () => {
  const first = socket(); const second = socket();
  const readyFirst = waitEvent(first, "connect"); first.connect(); await readyFirst; await waitReady(first);
  const readySecond = waitEvent(second, "connect"); second.connect(); await readySecond; await waitReady(second);
  const disconnectedFirst = waitEvent(first, "disconnect");
  const disconnectedSecond = waitEvent(second, "disconnect");
  const restricted = waitEvent(first, "account_restricted");
  assert.equal((await archive()).status, 200);
  assert.equal((await restricted).code, "ACCOUNT_ARCHIVED");
  await Promise.all([disconnectedFirst, disconnectedSecond]);
  const reconnect = socket(); const rejected = waitEvent(reconnect, "connect_error"); reconnect.connect();
  assert.equal((await rejected).data.code, "ACCOUNT_ARCHIVED");
  await archive({ action: "unarchive", expectedVersion: 1 });
  const stale = socket(); const staleError = waitEvent(stale, "connect_error"); stale.connect();
  assert.equal((await staleError).data.code, "SESSION_REVOKED");
});
