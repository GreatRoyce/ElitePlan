const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const ClientProfile = require("../src/models/clientProfile.model");
const VendorProfile = require("../src/models/vendorProfile.model");
const PlannerProfile = require("../src/models/plannerProfile.model");
const Consultation = require("../src/models/initialConsultation.model");
const Message = require("../src/models/message.model");
const Event = require("../src/models/event.model");
const router = require("../src/routes/admin.routes");

const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa";
const TARGET = "bbbbbbbbbbbbbbbbbbbbbbbb";
const PROFILE = "cccccccccccccccccccccccc";
const OTHER = "dddddddddddddddddddddddd";
const secret = "admin-user-tests-only-secret";
const originalSecret = process.env.JWT_SECRET;
const originals = [];
let server;
let base;
let staff;
let users;
let profile;
let messages;
let calls;
let failure;

function stub(model, method, implementation) {
  originals.push([model, method, model[method]]);
  model[method] = implementation;
}

function matches(item, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((condition) => matches(item, condition));
    if (key === "$and") return value.every((condition) => matches(item, condition));
    if (value?.$regex !== undefined) return new RegExp(value.$regex, value.$options).test(item[key] || "");
    if (value?.$in) return value.$in.includes(item[key] ?? null);
    if (value?.$ne !== undefined || (value && Object.hasOwn(value, "$ne"))) return (item[key] ?? null) !== value.$ne;
    if (value?.$lte) return item[key] != null && new Date(item[key]) <= value.$lte;
    if (value?.$gt) return item[key] != null && new Date(item[key]) > value.$gt;
    if (value === null) return item[key] == null;
    return item[key] === value;
  });
}

function query(data, label, expectedProjection) {
  return {
    select(projection) { assert.equal(projection, expectedProjection); calls.push({ label, projection }); return this; },
    sort(order) {
      calls.push({ label, order });
      if (Array.isArray(data)) data = [...data].sort((a, b) => {
        for (const [key, direction] of Object.entries(order)) {
          if (a[key] > b[key]) return direction;
          if (a[key] < b[key]) return -direction;
        }
        return 0;
      });
      return this;
    },
    skip(offset) { calls.push({ label, offset }); data = data.slice(offset); return this; },
    limit(limit) { calls.push({ label, limit }); data = data.slice(0, limit); return this; },
    collation(options) { calls.push({ label, collation: options }); return this; },
    async lean() { if (failure) throw new Error("Internal database credentials"); return data; },
  };
}

before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => ({
    select(projection) {
      if (projection === "-password") { assert.equal(id, ADMIN); return Promise.resolve(staff); }
      calls.push({ label: "user-details", id });
      return query(users.find((item) => item._id === id) || null, "user-details", "_id username email phone role createdAt updatedAt accountStatus suspendedUntil archivedAt moderationVersion moderationReason moderationHistory archivedBy archiveReason moderatorPermissions staffMemberRole staffHistory").select(projection);
    },
  }));
  stub(User, "countDocuments", async (filter) => {
    calls.push({ label: "user-count", filter });
    if (failure) throw new Error("Internal database credentials");
    return users.filter((item) => matches(item, filter)).length;
  });
  stub(User, "find", (filter) => {
    calls.push({ label: "user-list", filter });
    return query(users.filter((item) => matches(item, filter)), "user-list", "_id username email phone role createdAt updatedAt accountStatus suspendedUntil archivedAt");
  });
  for (const [model, role, fields] of [
    [ClientProfile, "client", "_id fullName email phone locationPreference"],
    [VendorProfile, "vendor", "_id businessName contactPerson email phonePrimary description category city state country verified active"],
    [PlannerProfile, "planner", "_id fullName companyName email phonePrimary shortBio specialization state country verified active"],
  ]) {
    stub(model, "findOne", (filter) => {
      assert.deepEqual(filter, { [role === "client" ? "user" : "userId"]: TARGET });
      calls.push({ label: "profile", role, filter });
      return query(profile, "profile", fields);
    });
  }
  stub(Consultation, "countDocuments", async (filter) => {
    calls.push({ label: "consultation-count", filter });
    assert.ok(filter.user === TARGET || filter.targetUser === TARGET);
    return filter.user ? 2 : 4;
  });
  stub(Consultation, "find", (filter) => {
    assert.deepEqual(filter, { $or: [{ user: TARGET }, { targetUser: TARGET }] });
    return query([
      { _id: "request-sent", user: TARGET, eventType: "Wedding", eventDate: "2026-12-01T12:00Z", status: "pending", createdAt: "2026-10-07T12:00Z", notes: "Private note" },
      { _id: "request-received", user: OTHER, eventType: "Conference", eventDate: "2026-12-02T12:00Z", status: "approved", createdAt: "2026-10-06T12:00Z", notes: "Private note" },
    ], "consultations", "_id user eventType eventDate status createdAt");
  });
  stub(Message, "countDocuments", async (filter) => {
    calls.push({ label: "message-count", filter });
    return messages.filter((item) => matches(item, filter)).length;
  });
  stub(Event, "countDocuments", async (filter) => {
    calls.push({ label: "event-count", filter });
    const target = users.find((item) => item._id === TARGET);
    const role = target.role === "moderator" ? target.staffMemberRole : target.role;
    assert.deepEqual(filter, { [{ client: "client", vendor: "vendors", planner: "planner" }[role]]: PROFILE });
    return 3;
  });
  stub(Event, "find", (filter) => {
    calls.push({ label: "event-list", filter });
    return query([{ _id: "event-1", title: "Wedding celebration", date: "2026-12-01T12:00Z", status: "Upcoming", createdAt: "2026-10-07T12:00Z", description: "Private details" }], "events", "_id title date status");
  });
  const app = express();
  app.use(express.json());
  app.use("/admin", router);
  server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}/admin`;
});

beforeEach(() => {
  staff = { _id: ADMIN, role: "admin" };
  users = [
    { _id: TARGET, username: "Alice + Planner", email: "alice+planner@example.com", phone: "08012345678", role: "planner", createdAt: "2026-10-07T12:00Z", updatedAt: "2026-10-07T13:00Z", password: "Secret hash", token: "Secret token" },
    { _id: OTHER, username: "Bob Vendor", email: "bob@example.com", phone: "08098765432", role: "vendor", createdAt: "2026-10-06T12:00Z", password: "Secret hash" },
    { _id: ADMIN, username: "Staff", email: "staff@example.com", phone: "08000000000", role: "admin", createdAt: "2026-10-05T12:00Z", password: "Secret hash" },
  ];
  profile = { _id: PROFILE, user: TARGET, userId: TARGET, fullName: "Alice Planner", businessName: "Alice Events", companyName: "Alice Events", contactPerson: "Alice", email: "profile@example.com", phone: "08012345678", phonePrimary: "08012345678", locationPreference: { city: "Ikeja", state: "Lagos", country: "Nigeria" }, city: "Ikeja", state: "Lagos", country: "Nigeria", verified: true, active: false, specialization: ["Wedding Planning"], password: "Private profile password", dateOfBirth: "1990-01-01", gender: "other" };
  messages = [{ sender: TARGET, senderModel: "User", recipient: OTHER, recipientModel: "User", text: "Private text" }];
  calls = [];
  failure = false;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const [model, method, original] of originals) model[method] = original;
  if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
});

const token = (claimedRole = "admin", expiresIn = "5m") => jwt.sign({ id: ADMIN, role: claimedRole }, secret, { expiresIn });
async function get(path = "/users", auth = token()) {
  const response = await fetch(`${base}${path}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test("user list and details reject guests, expired tokens, and non-admin database roles", async () => {
  for (const path of ["/users", "/archive", `/users/${TARGET}`]) {
    assert.equal((await get(path, null)).status, 401);
    assert.equal((await get(path, token("admin", -1))).status, 401);
    for (const role of ["client", "vendor", "planner", "moderator"]) {
      staff.role = role;
      assert.equal((await get(path, token("admin"))).status, 403);
    }
    staff.role = "admin";
  }
  assert.equal(calls.length, 0);
});

test("archive listing separates removed users, searches retained records, and keeps details available", async () => {
  users[0].archivedAt = "2026-10-07T14:00:00.000Z";
  users[0].archivedBy = ADMIN;
  users[0].archiveReason = "Removed after review";
  const main = await get();
  assert.ok(!main.body.data.users.some((item) => item._id === TARGET));
  const removed = await get("/archive?search=alice%2Bplanner&role=planner");
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.pagination.total, 1);
  assert.equal(removed.body.data.users[0].accountStatus, "archived");
  assert.equal(removed.body.data.users[0].archivedAt, users[0].archivedAt);
  assert.equal((await get("/archive/")).body.data.pagination.total, 1);
  assert.deepEqual(calls.find((call) => call.label === "user-list" && call.order?.archivedAt).order, { archivedAt: -1, _id: -1 });
  assert.ok(!JSON.stringify(removed.body).includes("Secret"));
  const detail = await get(`/users/${TARGET}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.data.archive, { archivedAt: users[0].archivedAt, archivedBy: ADMIN, reason: users[0].archiveReason });
  assert.equal(detail.body.data.moderation.status, "archived");
  assert.ok(detail.body.data.profile);
  users[0].archivedAt = null;
  assert.equal((await get("/archive")).body.data.pagination.total, 0);
  assert.ok((await get()).body.data.users.some((item) => item._id === TARGET));
});

test("archive pagination and retained restriction filters apply only to saved records", async () => {
  users[0].archivedAt = "2026-10-06T14:00:00.000Z";
  users[1].archivedAt = "2026-10-07T14:00:00.000Z";
  users[0].accountStatus = "banned";
  const newest = await get("/archive?pageSize=1");
  assert.equal(newest.body.data.pagination.total, 2);
  assert.equal(newest.body.data.users[0]._id, OTHER);
  assert.equal((await get("/archive?pageSize=1&page=2")).body.data.users[0]._id, TARGET);
  assert.equal((await get("/archive?sort=oldest")).body.data.users[0]._id, TARGET);
  const banned = await get("/archive?status=banned");
  assert.equal(banned.body.data.pagination.total, 1);
  assert.equal(banned.body.data.users[0]._id, TARGET);
  assert.equal((await get("/users?status=banned")).body.data.pagination.total, 0);
  assert.equal((await get("/archive?archivedAt=null")).status, 400);
});

test("the user list includes staff, has stable sorting, and excludes private fields", async () => {
  const { status, body, headers } = await get();
  assert.equal(status, 200);
  assert.equal(headers.get("cache-control"), "no-store");
  assert.equal(body.data.users.length, 3);
  assert.deepEqual(body.data.pagination, { page: 1, pageSize: 25, total: 3, totalPages: 1 });
  assert.equal(body.data.users[0]._id, TARGET);
  assert.ok(body.data.users.some((item) => item.role === "admin"));
  assert.ok(!JSON.stringify(body).includes("Secret"));
  assert.deepEqual(Object.keys(body.data.users[0]), ["_id", "username", "email", "phone", "role", "createdAt", "updatedAt", "accountStatus", "suspendedUntil", "archivedAt"]);
  assert.deepEqual(calls.find((call) => call.label === "user-list" && call.order).order, { createdAt: -1, _id: -1 });
});

test("name, email, and phone searches are literal, case insensitive, and combine with role filters", async () => {
  for (const search of ["ALICE", "alice+planner@example.com", "080123"]) {
    const { body } = await get(`/users?search=${encodeURIComponent(search)}&role=planner`);
    assert.deepEqual(body.data.users.map((item) => item._id), [TARGET]);
  }
  assert.equal((await get("/users?search=.*")).body.data.pagination.total, 0);
  assert.equal((await get("/users?search=%5B%5D%28%29%7B%7D%5C%2B%3F%24%5E%7C")).body.data.pagination.total, 0);
  assert.equal((await get("/users?search=Alice&role=vendor")).body.data.pagination.total, 0);
});

test("pagination and sort options work and out-of-range pages clamp to existing results", async () => {
  const page = await get("/users?page=2&pageSize=1");
  assert.equal(page.body.data.users[0]._id, OTHER);
  assert.deepEqual(page.body.data.pagination, { page: 2, pageSize: 1, total: 3, totalPages: 3 });
  assert.equal((await get("/users?sort=oldest")).body.data.users[0]._id, ADMIN);
  assert.equal((await get("/users?sort=name")).body.data.users[0]._id, TARGET);
  assert.deepEqual(calls.find((call) => call.collation).collation, { locale: "en", strength: 2 });
  const beyond = await get("/users?page=99&pageSize=1");
  assert.equal(beyond.body.data.pagination.page, 3);
  assert.equal(beyond.body.data.users[0]._id, ADMIN);
  const empty = await get("/users?search=missing&page=99");
  assert.deepEqual(empty.body.data.pagination, { page: 1, pageSize: 25, total: 0, totalPages: 0 });
  assert.deepEqual(empty.body.data.users, []);
});

test("invalid filters and query injection attempts fail before any list database query", async () => {
  for (const query of ["role=owner", "sort=password", "page=0", "page=-1", "page=1.2", "page=100001", "pageSize=101", "pageSize=0", "pageSize=bad", "page=1&page=2", "role[$ne]=admin", "search[$regex]=.*", `search=${"a".repeat(101)}`]) assert.equal((await get(`/users?${query}`)).status, 400);
  assert.equal(calls.length, 0);
});

test("each member role resolves its actual profile relation and event links", async () => {
  for (const role of ["client", "vendor", "planner"]) {
    users[0].role = role;
    calls = [];
    const { status, body, headers } = await get(`/users/${TARGET}`);
    assert.equal(status, 200);
    assert.equal(headers.get("cache-control"), "no-store");
    assert.equal(calls.find((call) => call.label === "profile").role, role);
    assert.equal(body.data.profile.role, role);
    assert.equal(body.data.profile._id, PROFILE);
    assert.equal(body.data.activity.eventCount, 3);
    assert.equal(body.data.activity.consultationsSent, 2);
    assert.equal(body.data.activity.consultationsReceived, 4);
    assert.equal(body.data.profile.verified, role === "client" ? null : true);
    assert.equal(body.data.profile.listingActive, role === "client" ? null : false);
  }
});

test("detail responses exclude passwords, message content, consultation notes, and birth dates", async () => {
  const { body } = await get(`/users/${TARGET}`);
  const json = JSON.stringify(body);
  for (const privateValue of ["Secret", "Private", "dateOfBirth", "gender", "password", "notes"]) assert.ok(!json.includes(privateValue));
  // Permission descriptions can discuss profile text; message text fields must remain absent.
  const checkKeys = (value) => { if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { assert.notEqual(key, "text"); checkKeys(child); } };
  checkKeys(body);
  assert.deepEqual(body.data.recentConsultations.map((item) => item.direction), ["Sent", "Received"]);
  assert.equal(body.data.recentEvents[0].title, "Wedding celebration");
  assert.ok(calls.some((call) => call.label === "consultations" && call.limit === 5));
  assert.ok(calls.some((call) => call.label === "events" && call.limit === 5));
});

test("message totals distinguish profile models from account IDs", async () => {
  messages.push(
    { sender: PROFILE, senderModel: "PlannerProfile", recipient: TARGET, recipientModel: "User" },
    { sender: PROFILE, senderModel: "VendorProfile", recipient: PROFILE, recipientModel: "VendorProfile" },
    { sender: OTHER, senderModel: "User", recipient: PROFILE, recipientModel: "PlannerProfile" },
  );
  const { body } = await get(`/users/${TARGET}`);
  assert.equal(body.data.activity.messagesSent, 2);
  assert.equal(body.data.activity.messagesReceived, 2);
  assert.ok(calls.some((call) => call.label === "message-count" && call.filter.$or.some((condition) => condition.senderModel === "PlannerProfile")));
});

test("missing member profiles and staff accounts render without creating records or looking up member profiles", async () => {
  profile = null;
  const missing = await get(`/users/${TARGET}`);
  assert.equal(missing.status, 200);
  assert.equal(missing.body.data.profile, null);
  assert.equal(missing.body.data.activity.eventCount, 0);
  assert.deepEqual(missing.body.data.recentEvents, []);
  assert.ok(!calls.some((call) => ["event-count", "event-list"].includes(call.label)));
  users[0].role = "admin";
  calls = [];
  const admin = await get(`/users/${TARGET}`);
  assert.equal(admin.status, 200);
  assert.equal(admin.body.data.profile, null);
  assert.ok(!calls.some((call) => call.label === "profile"));
});

test("invalid IDs, missing accounts, and database failures return bounded errors", async () => {
  assert.equal((await get("/users/invalid")).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await get("/users/eeeeeeeeeeeeeeeeeeeeeeee")).status, 404);
  failure = true;
  assert.deepEqual((await get()).body, { success: false, message: "Unable to load users." });
  const details = await get(`/users/${TARGET}`);
  assert.equal(details.status, 500);
  assert.deepEqual(details.body, { success: false, message: "Unable to load user details." });
});

test("revoked staff access is checked on every request using the current database role", async () => {
  const auth = token();
  assert.equal((await get("/users", auth)).status, 200);
  calls = [];
  staff.role = "client";
  assert.equal((await get(`/users/${TARGET}`, auth)).status, 403);
  assert.equal(calls.length, 0);
  staff = null;
  assert.equal((await get("/users", auth)).status, 401);
});

test("account replacement and deletion remain unavailable on the user detail route", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await fetch(`${base}/users/${TARGET}`, { method, headers: { Authorization: `Bearer ${token()}` } });
    assert.equal(response.status, 404);
  }
  assert.equal(calls.length, 0);
});

test("status filters report expired suspensions as active alongside legacy accounts", async () => {
  users[0].accountStatus = "suspended";
  users[0].suspendedUntil = new Date(Date.now() + 3600000).toISOString();
  users[1].accountStatus = "suspended";
  users[1].suspendedUntil = new Date(Date.now() - 3600000).toISOString();
  const suspended = await get("/users?status=suspended");
  assert.deepEqual(suspended.body.data.users.map((user) => user._id), [TARGET]);
  const active = await get("/users?status=active");
  assert.deepEqual(active.body.data.users.map((user) => user._id), [OTHER, ADMIN]);
  assert.ok(active.body.data.users.every((user) => user.accountStatus === "active" && user.suspendedUntil === null));
  users[0].accountStatus = "banned";
  assert.equal((await get("/users?status=banned")).body.data.users[0]._id, TARGET);
  assert.equal((await get("/users?status=unknown")).status, 400);
});

test("moderators with Review users can search members but cannot read staff or archive records", async () => {
  staff.role = "moderator";
  staff.moderatorPermissions = ["users.read"];
  const result = await get("/users");
  assert.equal(result.status, 200);
  assert.equal(result.body.data.pagination.total, 2);
  assert.ok(result.body.data.users.every((user) => ["client", "vendor", "planner"].includes(user.role)));
  const detail = await get(`/users/${TARGET}`);
  assert.equal(detail.status, 200);
  assert.ok(detail.body.data.profile);
  assert.equal(detail.body.data.staff, undefined);
  assert.equal((await get(`/users/${ADMIN}`)).status, 403);
  assert.equal((await get("/users?role=admin")).status, 403);
  assert.equal((await get("/users?role=moderator")).status, 403);
  assert.equal((await get("/archive")).status, 403);
  users[0].archivedAt = new Date().toISOString();
  assert.equal((await get(`/users/${TARGET}`)).status, 403);
  assert.equal((await get("/users")).body.data.pagination.total, 1);
  staff.moderatorPermissions = [];
  assert.equal((await get("/users")).status, 403);
});

test("admin details show a moderator's saved member profile and staff permissions", async () => {
  users[0].role = "moderator";
  users[0].staffMemberRole = "planner";
  users[0].moderatorPermissions = ["users.read", "users.warn"];
  const result = await get(`/users/${TARGET}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.user.role, "moderator");
  assert.equal(result.body.data.profile.role, "planner");
  assert.deepEqual(result.body.data.staff.permissions, ["users.read", "users.warn"]);
  assert.equal(result.body.data.staff.memberRole, "planner");
  const listed = await get("/users?role=moderator");
  assert.equal(listed.body.data.pagination.total, 1);
});
