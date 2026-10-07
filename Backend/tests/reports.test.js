const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Report = require("../src/models/report.model");
const Message = require("../src/models/message.model");
const Consultation = require("../src/models/initialConsultation.model");
const ClientProfile = require("../src/models/clientProfile.model");
const VendorProfile = require("../src/models/vendorProfile.model");
const PlannerProfile = require("../src/models/plannerProfile.model");
const reportRoutes = require("../src/routes/reports.routes");
const adminRoutes = require("../src/routes/admin.routes");
const consultationRoutes = require("../src/routes/initialConsultation.routes");
const { parseReportQuery } = require("../src/services/reports.service");

const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa";
const MOD = "bbbbbbbbbbbbbbbbbbbbbbbb";
const TARGET = "cccccccccccccccccccccccc";
const OTHER = "dddddddddddddddddddddddd";
const SECOND_MOD = "eeeeeeeeeeeeeeeeeeeeeeee";
const ITEM = "111111111111111111111111";
const PROFILE = "222222222222222222222222";
const secret = "reports-tests-only";
const oldSecret = process.env.JWT_SECRET;
let reporter, users, reports, messages, consultations, profiles, server, base;
let failDatabase, forceConflict, duplicateRace, consultationFilters, writes;
const original = [];
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const valueId = (value) => value?._id || value;
const equal = (left, right) => left == null && right == null || String(valueId(left)) === String(valueId(right));
function matches(document, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some((entry) => matches(document, entry));
    const actual = document[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof mongoose.Types.ObjectId)) {
      if (expected.$in) return expected.$in.some((value) => equal(actual, value));
      if (expected.$nin) return !expected.$nin.some((value) => equal(actual, value));
      if (expected.$all) return expected.$all.every((value) => actual?.includes(value));
    }
    return equal(actual, expected);
  });
}
function query(getValue) {
  let sort, skip = 0, limit;
  async function execute() {
    let value = clone(await getValue());
    if (Array.isArray(value)) {
      if (sort) value.sort((a, b) => { for (const [key, direction] of Object.entries(sort)) { if (a[key] === b[key]) continue; return (a[key] > b[key] ? 1 : -1) * direction; } return 0; });
      value = value.slice(skip, limit === undefined ? undefined : skip + limit);
    }
    return value;
  }
  return { select() { return this; }, populate() { return this; }, sort(value) { sort = value; return this; }, skip(value) { skip = value; return this; }, limit(value) { limit = value; return this; }, lean: execute, exec: execute, then: (resolve, reject) => execute().then(resolve, reject) };
}
function stub(model, method, replacement) { original.push([model, method, model[method]]); model[method] = replacement; }
function seed(values = {}) {
  const doc = new Report({ reporter, requestId: randomUUID(), type: "general", targetLabel: "Site complaint", category: "other", subject: "A concern", details: "Please review what happened here.", ...values });
  assert.equal(doc.validateSync(), undefined);
  const value = clone(doc.toObject());
  Object.assign(value, { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  reports.set(value._id, value);
  return value;
}
before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null));
  stub(User, "find", (filter) => query(() => [...users.values()].filter((user) => matches(user, filter))));
  stub(Report, "findOne", (filter) => query(() => { if (failDatabase) throw new Error("Private connection credentials"); return [...reports.values()].find((report) => matches(report, filter)) || null; }));
  stub(Report, "find", (filter) => query(() => { if (failDatabase) throw new Error("Private connection credentials"); return [...reports.values()].filter((report) => matches(report, filter)); }));
  stub(Report, "countDocuments", async (filter) => { if (failDatabase) throw new Error("Private connection credentials"); return [...reports.values()].filter((report) => matches(report, filter)).length; });
  stub(Report, "create", async (values) => {
    if (failDatabase) throw new Error("Private connection credentials");
    const result = seed(values);
    if (duplicateRace) { duplicateRace = false; throw Object.assign(new Error("Duplicate"), { code: 11000 }); }
    return result;
  });
  stub(Report, "findOneAndUpdate", (filter, update, options) => query(() => {
    if (failDatabase) throw new Error("Private connection credentials");
    const report = [...reports.values()].find((entry) => matches(entry, filter));
    if (!report || forceConflict) return null;
    assert.equal(options.new, true); assert.equal(options.runValidators, true);
    assert.equal(update.$push.history.$slice, -100);
    writes.push(clone({ filter, update }));
    Object.assign(report, clone(update.$set)); report.version += update.$inc.version;
    report.history = [...report.history, ...clone(update.$push.history.$each)].slice(-100);
    report.updatedAt = new Date().toISOString();
    assert.equal(new Report(report).validateSync(), undefined);
    return report;
  }));
  stub(Message, "findById", (id) => query(() => messages.get(String(id)) || null));
  stub(Consultation, "findById", (id) => query(() => consultations.get(String(id)) || null));
  stub(Consultation, "find", (filter) => { consultationFilters.push(clone(filter)); return query(() => [...consultations.values()].filter((entry) => matches(entry, filter))); });
  for (const model of [ClientProfile, VendorProfile, PlannerProfile]) stub(model, "findById", (id) => query(() => profiles.get(`${model.modelName}:${id}`) || null));
  const app = express(); app.use(express.json());
  app.use("/api/reports", reportRoutes); app.use("/api/admin", adminRoutes); app.use("/api/consultation", consultationRoutes);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(() => {
  reporter = String(new mongoose.Types.ObjectId());
  users = new Map([
    [reporter, { _id: reporter, role: "client", username: "Reporter", accountStatus: "active" }],
    [ADMIN, { _id: ADMIN, role: "admin", username: "Admin" }],
    [MOD, { _id: MOD, role: "moderator", username: "Reviewer", moderatorPermissions: ["users.read", "reports.read", "reports.manage"] }],
    [SECOND_MOD, { _id: SECOND_MOD, role: "moderator", username: "Second reviewer", moderatorPermissions: ["users.read", "reports.read", "reports.manage"] }],
    [TARGET, { _id: TARGET, role: "planner", username: "Reported account", accountStatus: "active" }],
    [OTHER, { _id: OTHER, role: "vendor", username: "Other member" }],
  ]);
  reports = new Map(); messages = new Map(); consultations = new Map(); profiles = new Map();
  failDatabase = false; forceConflict = false; duplicateRace = false; consultationFilters = []; writes = [];
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [model, method, value] of original) model[method] = value; if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
function token(id = reporter, authVersion = 0) { return jwt.sign({ id, role: "admin", permissions: ["reports.read", "reports.manage"], authVersion }, secret); }
async function request(endpoint, { body, auth = token(), method } = {}) {
  const response = await fetch(`${base}${endpoint}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
function submit(values = {}, auth) { return request("/reports", { body: { requestId: randomUUID(), type: "general", category: "other", subject: "A concern", details: "Please review what happened here.", ...values }, ...(auth ? { auth } : {}) }); }
function action(report, values = {}, actor = MOD) { return request(`/admin/reports/${report._id}/actions`, { auth: token(actor), body: { action: "claim", expectedVersion: report.version, note: "Reviewing the available evidence", ...values } }); }

test("report endpoints reject guests, staff submissions, restricted and revoked member sessions", async () => {
  assert.equal((await request("/reports", { auth: null })).status, 401);
  assert.equal((await submit({}, token(ADMIN))).status, 403);
  assert.equal((await submit({}, token(MOD))).status, 403);
  for (const values of [{ accountStatus: "banned" }, { accountStatus: "suspended", suspendedUntil: "2099-01-01" }, { archivedAt: "2026-01-01" }, { authVersion: 1 }]) {
    users.set(reporter, { _id: reporter, role: "client", ...values });
    const result = await submit(); assert.ok([401, 403].includes(result.status));
  }
  assert.equal(reports.size, 0);
});
test("members create general complaints with safe responses and no-store caching", async () => {
  const result = await submit({ subject: "  A concern  " });
  assert.equal(result.status, 201); assert.equal(result.body.data.subject, "A concern");
  assert.equal(result.body.data.status, "open"); assert.equal(result.headers.get("cache-control"), "no-store");
  const report = [...reports.values()][0]; assert.equal(report.reporter, reporter); assert.equal(report.version, 0);
  for (const key of ["reporter", "requestId", "history", "priority", "assignedTo", "adminOnly", "targetUser", "version"]) assert.equal(Object.hasOwn(result.body.data, key), false);
});
test("creation validates lengths, categories, request IDs, target IDs and injected staff fields", async () => {
  for (const values of [{ subject: "a" }, { details: "short" }, { category: "wrong" }, { type: "wrong" }, { requestId: "wrong" }, { history: [] }, { adminOnly: false }, { type: "account", targetId: "wrong" }, { type: "general", targetId: TARGET }]) assert.equal((await submit(values)).status, 400);
  assert.equal(reports.size, 0);
});
test("account targets cannot be self or missing; staff and staff-conduct complaints require admin review", async () => {
  assert.equal((await submit({ type: "account", targetId: reporter })).status, 404);
  assert.equal((await submit({ type: "account", targetId: ITEM })).status, 404);
  const result = await submit({ type: "account", targetId: TARGET }); assert.equal(result.status, 201); assert.equal(result.body.data.targetLabel, "Reported account");
  await submit({ type: "account", targetId: MOD }); await submit({ category: "staff_conduct" });
  assert.equal([...reports.values()].filter((entry) => entry.adminOnly).length, 2);
});
test("submission retries return the same case and reject reused IDs with different contents", async () => {
  const requestId = randomUUID(); const first = await submit({ requestId }); const second = await submit({ requestId });
  assert.equal(second.status, 200); assert.equal(second.body.data._id, first.body.data._id); assert.equal(reports.size, 1);
  assert.equal((await submit({ requestId, details: "Changed complaint information" })).status, 409);
});
test("a concurrent unique-index conflict is recovered as an idempotent submission", async () => {
  duplicateRace = true; const result = await submit(); assert.equal(result.status, 200); assert.equal(reports.size, 1);
  assert.ok(Report.schema.indexes().some(([keys, options]) => keys.reporter === 1 && keys.requestId === 1 && options.unique));
});
test("message evidence is available only to the recipient and includes just the reported message", async () => {
  messages.set(ITEM, { sender: TARGET, senderModel: "User", recipient: reporter, recipientModel: "User", text: "Abusive incoming message", createdAt: "2026-10-07T10:00:00Z", secret: "Other conversation content" });
  const context = await request(`/reports/context?type=message&targetId=${ITEM}`);
  assert.equal(context.status, 200); assert.equal(context.body.data.evidence.text, "Abusive incoming message");
  assert.ok(!JSON.stringify(context.body).includes("Other conversation content"));
  assert.equal((await submit({ type: "message", targetId: ITEM }, token(OTHER))).status, 404);
  assert.equal((await submit({ type: "message", targetId: ITEM }, token(TARGET))).status, 404);
  assert.equal((await submit({ type: "message", targetId: ITEM })).status, 201);
});
test("typed profile message participants resolve through their actual user ownership", async () => {
  for (const [model, key] of [[ClientProfile, "user"], [VendorProfile, "userId"], [PlannerProfile, "userId"]]) {
    profiles.set(`${model.modelName}:${PROFILE}`, { [key]: TARGET });
    messages.set(ITEM, { sender: PROFILE, senderModel: model.modelName, recipient: reporter, recipientModel: "User", text: "x".repeat(6000) });
    const result = await submit({ type: "message", targetId: ITEM }); assert.equal(result.status, 201); assert.equal(result.body.data.evidence.text.length, 5000); assert.equal([...reports.values()].at(-1).targetUser, TARGET);
  }
  messages.get(ITEM).recipient = PROFILE; messages.get(ITEM).recipientModel = "PlannerProfile";
  assert.equal((await submit({ type: "message", targetId: ITEM })).status, 404);
});
test("consultation reports require participant ownership and capture limited evidence", async () => {
  consultations.set(ITEM, { _id: ITEM, user: reporter, targetUser: TARGET, eventType: "Wedding", eventDate: "2026-12-01T00:00:00Z", status: "approved", notes: "Private notes", contactMethod: "Secret contact" });
  assert.equal((await submit({ type: "consultation", targetId: ITEM }, token(OTHER))).status, 404);
  const first = await submit({ type: "consultation", targetId: ITEM }); const second = await submit({ type: "consultation", targetId: ITEM }, token(TARGET));
  assert.equal(first.status, 201); assert.equal(second.status, 201); assert.equal(first.body.data.evidence.eventType, "Wedding");
  assert.ok(!JSON.stringify(first.body).includes("Private notes")); assert.ok(!JSON.stringify(first.body).includes("Secret contact"));
});
test("context lookup rejects malformed, unsupported and unauthorized targets", async () => {
  for (const endpoint of ["/reports/context?type=general&targetId=" + ITEM, "/reports/context?type=message&targetId=bad", "/reports/context?type=account&targetId=" + TARGET + "&extra=x"]) assert.equal((await request(endpoint)).status, 400);
  assert.equal((await request(`/reports/context?type=message&targetId=${ITEM}`)).status, 404);
});
test("own reports and details exclude other reporters, target accounts and all private staff fields", async () => {
  const own = seed({ assignedTo: MOD, history: [{ action: "note", by: MOD, at: new Date(), note: "Private investigation", status: "under_review", priority: "normal" }] });
  seed({ reporter: OTHER });
  const list = await request("/reports"); assert.equal(list.body.data.pagination.total, 1);
  const detail = await request(`/reports/${own._id}`); assert.equal(detail.status, 200); assert.ok(!JSON.stringify(detail.body).includes("Private investigation"));
  assert.equal((await request(`/reports/${own._id}`, { auth: token(TARGET) })).status, 404);
  assert.equal((await request(`/reports/${own._id}`, { auth: token(OTHER) })).status, 404);
  assert.equal((await request("/reports?assigned=mine")).status, 400);
});
test("staff report permissions come from current database grants, not token claims", async () => {
  const report = seed(); users.get(MOD).moderatorPermissions = ["users.read"];
  assert.equal((await request("/admin/reports", { auth: token(MOD) })).status, 403);
  users.get(MOD).moderatorPermissions.push("reports.read");
  assert.equal((await request("/admin/reports", { auth: token(MOD) })).status, 200);
  assert.equal((await action(report)).status, 403);
  assert.equal((await request("/admin/reports", { auth: token() })).status, 403);
  assert.equal((await request("/admin/reports", { auth: token(ADMIN) })).status, 200);
});
test("moderators cannot access staff cases or cases whose reporter or target has since become staff", async () => {
  const adminOnly = seed({ adminOnly: true }); const promoted = seed({ targetUser: TARGET }); const staffReporter = seed({ reporter: SECOND_MOD });
  users.get(TARGET).role = "moderator";
  const list = await request("/admin/reports", { auth: token(MOD) }); assert.equal(list.body.data.pagination.total, 0);
  for (const report of [adminOnly, promoted, staffReporter]) {
    assert.equal((await request(`/admin/reports/${report._id}`, { auth: token(MOD) })).status, 404);
    assert.equal((await action(report)).status, 404);
    assert.equal((await request(`/admin/reports/${report._id}`, { auth: token(ADMIN) })).status, 200);
  }
});
test("reviewers cannot handle a report involving their own account, including admins", async () => {
  const report = seed({ targetUser: ADMIN, adminOnly: true }); assert.equal((await action(report, {}, ADMIN)).status, 403); assert.equal(writes.length, 0);
});
test("claiming records reviewer, note and version; another moderator cannot change the assigned case", async () => {
  const report = seed(); const result = await action(report);
  assert.equal(result.status, 200); assert.equal(report.status, "under_review"); assert.equal(report.assignedTo, MOD); assert.equal(report.version, 1);
  assert.equal(report.history[0].by, MOD); assert.equal(report.history[0].action, "claim");
  assert.equal((await action(report, { action: "note" }, SECOND_MOD)).status, 409);
  assert.equal((await action(report, { action: "claim" })).status, 409);
});
test("admins assign only active eligible reviewers and moderators cannot reassign", async () => {
  const report = seed(); assert.equal((await action(report, { action: "assign", assignedTo: SECOND_MOD })).status, 403);
  for (const assignedTo of [OTHER, reporter, ITEM]) assert.equal((await action(report, { action: "assign", assignedTo }, ADMIN)).status, 400);
  users.get(SECOND_MOD).accountStatus = "banned";
  assert.equal((await action(report, { action: "assign", assignedTo: SECOND_MOD }, ADMIN)).status, 400);
  users.get(SECOND_MOD).accountStatus = "active";
  assert.equal((await action(report, { action: "assign", assignedTo: SECOND_MOD }, ADMIN)).status, 200); assert.equal(report.assignedTo, SECOND_MOD);
});
test("staff-sensitive cases cannot be assigned to moderators even after a later staff promotion", async () => {
  const direct = seed({ targetUser: MOD, adminOnly: true }); const later = seed({ targetUser: TARGET }); users.get(TARGET).role = "moderator";
  for (const report of [direct, later]) assert.equal((await action(report, { action: "assign", assignedTo: SECOND_MOD }, ADMIN)).status, 400);
  assert.equal((await action(direct, { action: "claim" }, ADMIN)).status, 200);
});
test("reviewers directory is admin-only and excludes restricted and unqualified accounts", async () => {
  users.get(MOD).moderatorPermissions = ["reports.read"]; users.get(SECOND_MOD).archivedAt = new Date().toISOString();
  assert.equal((await request("/admin/reports/reviewers", { auth: token(MOD) })).status, 403);
  const result = await request("/admin/reports/reviewers", { auth: token(ADMIN) }); assert.equal(result.status, 200); assert.deepEqual(result.body.data.map((entry) => entry._id), [ADMIN]);
  assert.deepEqual(Object.keys(result.body.data[0]).sort(), ["_id", "role", "username"]);
});
test("closing cases requires a public resolution while notes remain private; reporting never bans users", async () => {
  const report = seed({ targetUser: TARGET }); await action(report);
  assert.equal((await action(report, { action: "resolve" })).status, 400);
  assert.equal((await action(report, { action: "resolve", resolution: "Concern reviewed and addressed", note: "Private evidence and reasoning" })).status, 200);
  assert.equal(report.status, "resolved"); assert.ok(report.resolvedAt); assert.equal(report.history.at(-1).resolution, report.resolution);
  const detail = await request(`/reports/${report._id}`); assert.equal(detail.body.data.resolution, "Concern reviewed and addressed"); assert.ok(!JSON.stringify(detail.body).includes("Private evidence and reasoning"));
  const list = await request("/reports"); assert.ok(!JSON.stringify(list.body).includes("Private evidence and reasoning"));
  assert.equal(users.get(TARGET).accountStatus, "active"); assert.equal((await action(report, { action: "note" })).status, 409);
});
test("dismissal, reopening and release follow state rules and retain prior decision history", async () => {
  const report = seed(); assert.equal((await action(report, { action: "reopen" })).status, 409);
  await action(report); await action(report, { action: "dismiss", resolution: "Insufficient supporting evidence" });
  assert.equal(report.status, "dismissed"); assert.equal((await action(report, { action: "reopen" })).status, 200);
  assert.equal(report.status, "open"); assert.equal(report.resolution, null); assert.equal(report.assignedTo, null);
  assert.equal(report.history.find((entry) => entry.action === "dismiss").resolution, "Insufficient supporting evidence");
  assert.equal((await action(report, { action: "release" })).status, 409); await action(report); await action(report, { action: "release" }); assert.equal(report.assignedTo, null); assert.equal(report.status, "open");
});
test("notes and urgency updates preserve assignment and limit private history to the latest 100 entries", async () => {
  const history = Array.from({ length: 100 }, () => ({ action: "note", by: MOD, at: new Date(), note: "Older note", status: "under_review", priority: "normal" }));
  const report = seed({ status: "under_review", assignedTo: MOD, history });
  await action(report, { action: "priority", priority: "urgent" }); await action(report, { action: "note", note: "Latest private note" });
  assert.equal(report.priority, "urgent"); assert.equal(report.assignedTo, MOD); assert.equal(report.history.length, 100);
  const result = await request(`/admin/reports/${report._id}`, { auth: token(MOD) }); assert.equal(result.body.data.history[0].note, "Latest private note");
});
test("stale versions and atomic conflicts reject writes without losing another reviewer's work", async () => {
  const report = seed(); assert.equal((await action(report, { expectedVersion: 99 })).status, 409); assert.equal(writes.length, 0);
  forceConflict = true; assert.equal((await action(report)).status, 409); assert.equal(report.status, "open"); assert.equal(report.version, 0); assert.equal(writes.length, 0);
});
test("unsupported actions, body injection and irrelevant fields are rejected", async () => {
  const report = seed();
  for (const values of [{ action: "delete" }, { expectedVersion: -1 }, { note: " " }, { note: "x".repeat(1001) }, { resolution: "Not closing" }, { assignedTo: MOD }, { priority: "urgent" }, { status: "resolved" }, { action: "priority", priority: "high" }]) assert.equal((await action(report, values)).status, 400);
  assert.equal(writes.length, 0);
});
test("report query parsing rejects injection and keeps sorting, pagination and assignment filters bounded", () => {
  for (const query of [{ page: "0" }, { page: "1e2" }, { pageSize: "101" }, { page: "100001" }, { status: ["open"] }, { status: "unknown" }, { status: { $ne: "resolved" } }, { extra: "x" }, { sort: "all" }]) assert.equal(parseReportQuery(query, true, MOD), null);
  const parsed = parseReportQuery({ status: "open", assigned: "mine", sort: "priority", page: "2", pageSize: "10" }, true, MOD);
  assert.deepEqual(parsed.filter, { status: "open", assignedTo: MOD }); assert.deepEqual(parsed.sort, { priority: -1, createdAt: 1, _id: 1 }); assert.equal(parsed.page, 2);
});
test("staff queue filters and pagination are applied within the authorized scope", async () => {
  seed({ priority: "urgent", status: "under_review", assignedTo: MOD }); seed({ priority: "urgent", adminOnly: true }); seed();
  const result = await request("/admin/reports?priority=urgent&assigned=mine&page=999&pageSize=1", { auth: token(MOD) });
  assert.equal(result.status, 200); assert.equal(result.body.data.pagination.total, 1); assert.equal(result.body.data.pagination.page, 1); assert.equal(result.body.data.reports.length, 1);
});
test("database failures return bounded errors without exposing private internals", async () => {
  failDatabase = true;
  for (const result of [await submit(), await request("/reports"), await request(`/reports/${ITEM}`)]) { assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("Private connection credentials")); }
});
test("submissions are limited per account and a second account is unaffected", async () => {
  for (let index = 0; index < 10; index++) assert.equal((await submit()).status, 201);
  const limited = await submit(); assert.equal(limited.status, 429); assert.equal(limited.headers.get("cache-control"), "no-store");
  assert.equal((await submit({}, token(OTHER))).status, 201);
});
test("my pending consultations are participant-scoped for all three member roles", async () => {
  consultations.set(ITEM, { _id: ITEM, user: reporter, targetUser: TARGET, status: "pending" });
  consultations.set(PROFILE, { _id: PROFILE, user: OTHER, targetUser: TARGET, status: "pending" });
  const incoming = String(new mongoose.Types.ObjectId()); consultations.set(incoming, { _id: incoming, user: OTHER, targetUser: reporter, status: "pending" });
  const closed = String(new mongoose.Types.ObjectId()); consultations.set(closed, { _id: closed, user: reporter, targetUser: TARGET, status: "approved" });
  for (const role of ["client", "planner", "vendor"]) {
    users.get(reporter).role = role; const result = await request("/consultation/mine"); assert.equal(result.status, 200);
    assert.deepEqual(result.body.map((entry) => entry._id).sort(), [ITEM, incoming].sort());
    assert.deepEqual(consultationFilters.at(-1), { status: "pending", $or: [{ user: reporter }, { targetUser: reporter }] });
  }
});
