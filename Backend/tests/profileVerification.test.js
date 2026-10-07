const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const VendorProfile = require("../src/models/vendorProfile.model");
const PlannerProfile = require("../src/models/plannerProfile.model");
const adminRoutes = require("../src/routes/admin.routes");
const vendorRoutes = require("../src/routes/profiles/vendor.routes");
const plannerRoutes = require("../src/routes/profiles/planner.routes");
const verification = require("../src/services/profileVerification.service");
const controller = require("../src/controllers/profileVerification.controller");
const vendorUploads = require("../src/controllers/profiles/uploadVendor.controller");
const plannerUploads = require("../src/controllers/profiles/uploadPlanner.controller");
const authMiddleware = require("../src/middleware/authMiddleware");

const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa";
const VENDOR = "bbbbbbbbbbbbbbbbbbbbbbbb";
const PLANNER = "cccccccccccccccccccccccc";
const MOD = "dddddddddddddddddddddddd";
const CLIENT = "eeeeeeeeeeeeeeeeeeeeeeee";
const VP = "111111111111111111111111";
const PP = "222222222222222222222222";
const OTHER = "333333333333333333333333";
const secret = "verification-test-secret";
const oldSecret = process.env.JWT_SECRET;
let users, profiles, server, base, writes, pipelines, failDatabase, forceConflict, editDuringWrite;
const originals = [];
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const equal = (a, b) => a == null && b == null || String(a) === String(b);
const field = (value, key) => key.split(".").reduce((current, part) => current?.[part], value);
function matches(value, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some((condition) => matches(value, condition));
    const actual = field(value, key);
    if (expected && typeof expected === "object") {
      if (Object.hasOwn(expected, "$exists")) return (actual !== undefined) === expected.$exists;
      if (Object.hasOwn(expected, "$ne")) return !equal(actual, expected.$ne);
      if (expected.$in) return expected.$in.some((item) => equal(actual, item));
      if (expected.$nin) return !expected.$nin.some((item) => equal(actual, item));
      if (expected.$regex !== undefined) return new RegExp(expected.$regex, expected.$options).test(actual || "");
    }
    return equal(actual, expected);
  });
}
function query(getValue, guarded = true) {
  return { select() { return this; }, populate(options) {
    if (typeof options === "object") this.populateOwner = options;
    return this;
  }, lean() { return this.execute(); }, async execute() {
    if (guarded && failDatabase) throw new Error("Private database credentials");
    const value = clone(await getValue());
    if (this.populateOwner) for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      const user = users.get(String(item.userId));
      item.userId = user && !user.archivedAt && ["client", "vendor", "planner"].includes(user.role) ? { _id: user._id, username: user.username, email: user.email } : null;
    }
    return value;
  }, then(resolve, reject) { return this.execute().then(resolve, reject); } };
}
function stub(model, method, implementation) { originals.push([model, method, model[method]]); model[method] = implementation; }
function makeProfile(type, extra = {}) {
  const Model = type === "vendor" ? VendorProfile : PlannerProfile;
  const defaults = type === "vendor" ? { _id: VP, userId: VENDOR, businessName: "Events & Decor", contactPerson: "Vendor Contact", email: "vendor@example.com", phonePrimary: "08012345678", category: "Decor & Ambience", state: "Lagos", country: "Nigeria" } : { _id: PP, userId: PLANNER, fullName: "Planner Contact", email: "planner@example.com", companyName: "Planning Company", phonePrimary: "08012345679", state: "Lagos", country: "Nigeria", specialization: ["Wedding Planning"] };
  const model = new Model({ ...defaults, ...extra }); assert.equal(model.validateSync(), undefined);
  return clone(model.toObject());
}
before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => query(() => users.get(String(id)) || null, false));
  for (const [Model, type] of [[VendorProfile, "vendor"], [PlannerProfile, "planner"]]) {
    stub(Model, "findById", (id) => query(() => profiles[type].get(String(id)) || null));
    stub(Model, "findOne", (filter) => query(() => [...profiles[type].values()].find((value) => matches(value, filter)) || null));
    stub(Model, "find", (filter = {}) => query(() => [...profiles[type].values()].filter((value) => matches(value, filter))));
    stub(Model, "findOneAndUpdate", (filter, update, options) => query(() => {
      const value = profiles[type].get(String(filter._id)) || [...profiles[type].values()].find((item) => matches(item, filter));
      if (editDuringWrite && value) value.verificationVersion = (value.verificationVersion || 0) + 1;
      if (!value || !matches(value, filter) || forceConflict) return null;
      assert.equal(options.new, true);
      assert.equal(Object.hasOwn(update, "userId"), false);
      if (update.$push?.verificationHistory) assert.equal(update.$push.verificationHistory.$slice, -100);
      writes.push(clone({ type, filter, update }));
      Object.assign(value, clone(update.$set));
      for (const [key, increment] of Object.entries(update.$inc || {})) value[key] = (value[key] || 0) + increment;
      if (update.$push?.verificationHistory) value.verificationHistory = [...(value.verificationHistory || []), ...clone(update.$push.verificationHistory.$each)].slice(-100);
      if (update.$push?.contentHistory) { assert.equal(update.$push.contentHistory.$slice, -100); value.contentHistory = [...(value.contentHistory || []), ...clone(update.$push.contentHistory.$each)].slice(-100); }
      if (update.$push?.gallery) value.gallery = [...(value.gallery || []), ...update.$push.gallery.$each];
      assert.equal(new Model(value).validateSync(), undefined);
      return value;
    }));
    stub(Model, "findOneAndDelete", (filter) => query(() => {
      const value = profiles[type].get(String(filter._id));
      if (editDuringWrite && value) value.verificationVersion = (value.verificationVersion || 0) + 1;
      if (!value || !matches(value, filter) || forceConflict) return null;
      profiles[type].delete(String(filter._id)); writes.push({ type, filter, deleted: true }); return value;
    }));
    stub(Model, "aggregate", async (pipeline) => {
      if (failDatabase) throw new Error("Private database credentials");
      pipelines.push(clone({ type, pipeline }));
      let values = [...profiles[type].values()].map(clone);
      for (const stage of pipeline) {
        if (stage.$match) values = values.filter((value) => matches(value, stage.$match));
        if (stage.$lookup) { assert.equal(stage.$lookup.from, User.collection.name); assert.equal(stage.$lookup.localField, "userId"); values = values.map((value) => ({ ...value, owner: clone(users.get(String(value.userId))) })); }
        if (stage.$unwind) values = values.filter((value) => value.owner);
        if (stage.$count) return values.length ? [{ total: values.length }] : [];
        if (stage.$sort) values.sort((a, b) => { for (const [key, direction] of Object.entries(stage.$sort)) { if (a[key] === b[key]) continue; return (a[key] > b[key] ? 1 : -1) * direction; } return 0; });
        if (stage.$skip) values = values.slice(stage.$skip);
        if (stage.$limit) values = values.slice(0, stage.$limit);
      }
      return values;
    });
  }
  const app = express(); app.use(express.json()); app.use("/admin", adminRoutes); app.use("/vendor", vendorRoutes); app.use("/planner", plannerRoutes);
  // Upload controllers use authenticated synthetic files; no real files are written.
  app.post("/:type/test-image", authMiddleware(["vendor", "planner"]), (req, res) => { req.file = { path: "uploads/changed-avatar.png" }; return (req.params.type === "vendor" ? vendorUploads.uploadVendorProfileImage : plannerUploads.uploadPlannerProfileImage)(req, res); });
  app.post("/:type/test-gallery", authMiddleware(["vendor", "planner"]), (req, res) => { req.files = [{ path: "uploads/new-gallery.png" }]; return (req.params.type === "vendor" ? vendorUploads.uploadVendorGallery : plannerUploads.uploadPlannerGallery)(req, res); });
  server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); }); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  users = new Map([[ADMIN, { _id: ADMIN, id: ADMIN, role: "admin", username: "Admin" }], [VENDOR, { _id: VENDOR, id: VENDOR, role: "vendor", username: "Vendor", email: "vendor@example.com" }], [PLANNER, { _id: PLANNER, id: PLANNER, role: "planner", username: "Planner", email: "planner@example.com" }], [MOD, { _id: MOD, id: MOD, role: "moderator", username: "Moderator", moderatorPermissions: ["users.read", "reports.manage"] }], [CLIENT, { _id: CLIENT, id: CLIENT, role: "client", username: "Client" }]]);
  profiles = { vendor: new Map([[VP, makeProfile("vendor")]]), planner: new Map([[PP, makeProfile("planner")]]) };
  writes = []; pipelines = []; failDatabase = false; forceConflict = false; editDuringWrite = false;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [model, method, value] of originals) model[method] = value; if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
function token(id = ADMIN, authVersion = 0) { return jwt.sign({ id, role: "admin", authVersion }, secret); }
async function request(path, { auth = token(), body, method } = {}) {
  const response = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"), headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
const profileId = (type) => type === "vendor" ? VP : PP;
const ownerId = (type) => type === "vendor" ? VENDOR : PLANNER;
function decide(type = "vendor", body = {}, auth) { return request(`/admin/verification/${type}/${profileId(type)}`, { body: { action: "approve", expectedVersion: 0, reason: "Business identity and contact details reviewed independently", ...body }, ...(auth ? { auth } : {}) }); }
function edit(type, body) { return request(`/${type}/update/me`, { auth: token(ownerId(type)), method: "PUT", body }); }

test("verification routes are admin-only and forged token roles do not grant access", async () => {
  for (const auth of [null, token(VENDOR), token(PLANNER), token(CLIENT), token(MOD)]) {
    const expected = auth ? 403 : 401;
    assert.equal((await request("/admin/verification", { auth })).status, expected);
    assert.equal((await request(`/admin/verification/vendor/${VP}`, { auth })).status, expected);
    assert.equal((await request(`/admin/verification/vendor/${VP}`, { auth, body: { action: "approve", reason: "Reviewed", expectedVersion: 0 } })).status, expected);
  }
  assert.equal(writes.length, 0);
});
test("verification gates current staff sessions and revoked admin roles", async () => {
  users.get(ADMIN).role = "client"; assert.equal((await decide()).status, 403);
  users.get(ADMIN).role = "admin"; users.get(ADMIN).authVersion = 1; assert.equal((await decide()).status, 401);
  users.get(ADMIN).authVersion = 0; users.get(ADMIN).accountStatus = "banned"; assert.equal((await decide()).status, 403);
});
test("queue joins current professional owners and excludes archives, staff and orphan records", async () => {
  const visible = profiles.vendor.get(VP); visible.password = "Private hash"; visible.verificationReason = "Private reason"; visible.verificationHistory = [{ reason: "Private history" }];
  profiles.vendor.set(OTHER, makeProfile("vendor", { _id: OTHER, userId: MOD }));
  profiles.vendor.set(CLIENT, makeProfile("vendor", { _id: CLIENT, userId: CLIENT }));
  profiles.vendor.set(PLANNER, makeProfile("vendor", { _id: PLANNER, userId: OTHER }));
  const result = await request("/admin/verification"); assert.equal(result.status, 200); assert.equal(result.body.data.pagination.total, 1); assert.equal(result.body.data.profiles[0]._id, VP);
  assert.equal(result.headers.get("cache-control"), "no-store"); assert.ok(!JSON.stringify(result.body).includes("Private"));
  assert.ok(pipelines[0].pipeline.some((stage) => stage.$match?.["owner.role"] === "vendor" && stage.$match["owner.archivedAt"] === null));
  users.get(VENDOR).archivedAt = new Date().toISOString(); assert.equal((await request("/admin/verification")).body.data.pagination.total, 0);
});
test("queue filters verification states including legacy records with no metadata", async () => {
  const vendor = profiles.vendor.get(VP); delete vendor.verificationStatus; delete vendor.verificationVersion;
  assert.equal((await request("/admin/verification?status=unverified")).body.data.pagination.total, 1);
  vendor.verified = true; assert.equal((await request("/admin/verification?status=verified")).body.data.pagination.total, 1);
  assert.equal((await request("/admin/verification?status=unverified")).body.data.pagination.total, 0);
  vendor.verified = false;
  for (const status of ["rejected", "revoked"]) { vendor.verificationStatus = status; assert.equal((await request(`/admin/verification?status=${status}`)).body.data.pagination.total, 1); }
  assert.equal((await request("/admin/verification?type=planner")).body.data.profiles[0]._id, PP);
});
test("queue supports literal search, stable sort and clamped bounded pagination", async () => {
  profiles.vendor.get(VP).businessName = "[Decor]+ Studio";
  assert.equal((await request("/admin/verification?search=%5BDecor%5D%2B")).body.data.pagination.total, 1);
  assert.equal((await request("/admin/verification?search=.%2A")).body.data.pagination.total, 0);
  const result = await request("/admin/verification?page=999&pageSize=1&sort=newest"); assert.equal(result.body.data.pagination.page, 1); assert.equal(result.body.data.profiles.length, 1);
  assert.deepEqual(pipelines.at(-1).pipeline.find((stage) => stage.$sort).$sort, { lastUpdated: -1, _id: -1 });
});
test("strict query validation rejects malformed filters and injection before querying profiles", async () => {
  for (const query of ["type=client", "status=pending", "sort=priority", "page=0", "page=1e2", "pageSize=101", "page=100001", "extra=x", "status=verified&status=unverified"]) assert.equal((await request(`/admin/verification?${query}`)).status, 400);
  assert.equal(pipelines.length, 0);
  assert.equal(controller.parseQuery({ search: { $ne: "" } }), null);
});
test("detail responses use safe profile fields and admin-only bounded decision history", async () => {
  const value = profiles.planner.get(PP); value.password = "Private hash"; value.details = { unrelated: "Private internals" };
  const result = await request(`/admin/verification/planner/${PP}`); assert.equal(result.status, 200); assert.equal(result.body.data.eligibility.canApprove, true); assert.equal(result.body.data.verification.version, 0);
  assert.ok(!JSON.stringify(result.body).includes("Private")); assert.equal(result.body.data.owner.role, "planner");
  for (const path of [`/admin/verification/client/${VP}`, "/admin/verification/vendor/bad"]) assert.equal((await request(path)).status, 400);
  assert.equal((await request(`/admin/verification/vendor/${OTHER}`)).status, 404);
});
test("vendor and planner approvals record the admin, reason, timestamps and version without changing the account", async () => {
  const beforeUsers = clone([...users.values()]);
  for (const type of ["vendor", "planner"]) {
    const result = await decide(type); const value = profiles[type].get(profileId(type));
    assert.equal(result.status, 200); assert.equal(value.verified, true); assert.equal(value.verificationStatus, "verified"); assert.equal(value.verifiedBy, ADMIN); assert.ok(value.verifiedAt); assert.equal(value.verificationVersion, 1);
    assert.equal(value.verificationHistory[0].action, "approve"); assert.equal(value.verificationHistory[0].by, ADMIN); assert.equal(value.verificationHistory[0].reason, result.body.data.verification.reason);
    if (type === "vendor") { assert.equal(value.approvedBy, ADMIN); assert.equal(value.dateApproved, value.verifiedAt); }
  }
  assert.deepEqual([...users.values()], beforeUsers);
});
test("incomplete placeholder and restricted profiles cannot be approved", async () => {
  const value = profiles.vendor.get(VP); value.businessName = "N/A"; value.email = "wrong"; value.phonePrimary = "N/A"; value.state = "";
  const detail = (await request(`/admin/verification/vendor/${VP}`)).body.data; assert.equal(detail.eligibility.canApprove, false); assert.ok(detail.eligibility.missingFields.includes("Business name")); assert.ok(detail.eligibility.missingFields.includes("Valid email"));
  assert.equal((await decide()).status, 409);
  profiles.vendor.set(VP, makeProfile("vendor"));
  for (const data of [{ accountStatus: "banned" }, { accountStatus: "suspended", suspendedUntil: "2099-01-01" }]) { Object.assign(users.get(VENDOR), data); assert.equal((await decide()).status, 409); }
  assert.equal(writes.length, 0);
});
test("expired suspensions allow approval and archived or promoted owners are unavailable", async () => {
  users.get(VENDOR).accountStatus = "suspended"; users.get(VENDOR).suspendedUntil = "2020-01-01"; assert.equal((await decide()).status, 200);
  users.get(PLANNER).archivedAt = new Date().toISOString(); assert.equal((await decide("planner")).status, 404);
  users.get(PLANNER).archivedAt = null; users.get(PLANNER).role = "moderator"; assert.equal((await decide("planner")).status, 404);
});
test("rejection, subsequent approval and revocation follow state transitions and retain reasons", async () => {
  assert.equal((await decide("vendor", { action: "revoke" })).status, 409);
  await decide("vendor", { action: "reject", reason: "Please correct the contact details" });
  const value = profiles.vendor.get(VP); assert.equal(value.verified, false); assert.equal(value.verificationStatus, "rejected");
  assert.equal((await decide("vendor", { action: "reject", expectedVersion: 1 })).status, 409);
  assert.equal((await decide("vendor", { expectedVersion: 1 })).status, 200);
  assert.equal((await decide("vendor", { expectedVersion: 2 })).status, 409);
  assert.equal((await decide("vendor", { action: "revoke", expectedVersion: 2, reason: "Business identity no longer confirmed" })).status, 200);
  assert.equal(value.verified, false); assert.equal(value.verificationStatus, "revoked"); assert.equal(value.verifiedBy, null); assert.equal(value.approvedBy, null);
  assert.deepEqual(value.verificationHistory.map((entry) => entry.action), ["reject", "approve", "revoke"]);
});
test("invalid decisions, versions, reasons and body injection cannot mutate profiles", async () => {
  for (const body of [{ action: "delete" }, { expectedVersion: "0" }, { expectedVersion: -1 }, { reason: " " }, { reason: "x".repeat(1001) }, { userId: ADMIN }, { verified: true }, { verificationHistory: [] }]) assert.equal((await decide("vendor", body)).status, 400);
  assert.equal(writes.length, 0);
});
test("legacy verified profiles preserve badges, can be revoked and retain only 100 history entries", async () => {
  const value = profiles.vendor.get(VP); value.verified = true; delete value.verificationVersion; delete value.verificationStatus;
  value.verificationHistory = Array.from({ length: 100 }, () => ({ action: "approve", by: ADMIN, at: new Date().toISOString(), reason: "Older approval", status: "verified" }));
  assert.equal((await decide("vendor", { action: "revoke" })).status, 200); assert.equal(value.verificationVersion, 1); assert.equal(value.verificationHistory.length, 100);
  const detail = await request(`/admin/verification/vendor/${VP}`); assert.equal(detail.body.data.verification.history[0].action, "revoke");
  assert.ok(writes[0].filter.$or.some((entry) => entry.verificationVersion?.$exists === false));
});
test("stale review versions and edits racing an approval cannot overwrite profile changes", async () => {
  assert.equal((await decide("vendor", { expectedVersion: 1 })).status, 409);
  forceConflict = true; assert.equal((await decide()).status, 409); forceConflict = false;
  editDuringWrite = true; assert.equal((await decide()).status, 409);
  assert.equal(profiles.vendor.get(VP).verified, false); assert.equal(writes.length, 0);
});
test("owner edits cannot self-verify or inject ownership, ratings, history and Mongo update operators", async () => {
  for (const type of ["vendor", "planner"]) {
    const value = profiles[type].get(profileId(type));
    const result = await edit(type, { tagline: "Updated tagline", verified: true, verificationStatus: "verified", verificationVersion: 100, verificationHistory: [], verifiedBy: ADMIN, approvedBy: ADMIN, userId: ADMIN, rating: 5, active: false, featured: true, reviews: [ADMIN] });
    assert.equal(result.status, 200); assert.equal(value.verified, false); assert.equal(value.userId, ownerId(type)); assert.equal(value.rating, 0); assert.equal(value.active, true); assert.equal(value.verificationVersion, 1); assert.equal(value.verificationHistory.length, 0);
    assert.equal((await edit(type, { $set: { verified: true } })).status, 400); assert.equal((await edit(type, { "verificationHistory.0.reason": "Fake" })).status, 400);
    assert.equal((await edit(type, { verified: true })).status, 400);
  }
});
test("identity edits clear a badge and record the member while cosmetic edits preserve it", async () => {
  for (const type of ["vendor", "planner"]) {
    await decide(type);
    const value = profiles[type].get(profileId(type));
    assert.equal((await edit(type, { tagline: "New tagline" })).status, 200); assert.equal(value.verified, true); assert.equal(value.verificationVersion, 2);
    const result = await edit(type, { phonePrimary: "08099999999" }); assert.equal(result.status, 200); assert.equal(value.verified, false); assert.equal(value.verificationStatus, "unverified"); assert.equal(value.verifiedBy, null); assert.equal(value.verificationHistory.at(-1).action, "profile_updated"); assert.equal(value.verificationHistory.at(-1).by, ownerId(type));
    assert.equal(result.body.data.verification.status, "unverified"); assert.match(result.body.data.verification.reason, /changed/);
  }
});
test("unchanged identity fields do not revoke verification and partial planner edits preserve specialization", async () => {
  await decide("planner"); const value = profiles.planner.get(PP);
  assert.equal((await edit("planner", { companyName: value.companyName, email: value.email, tagline: "Cosmetic edit" })).status, 200); assert.equal(value.verified, true); assert.deepEqual(value.specialization, ["Wedding Planning"]);
});
test("legacy profile owner updates accept a missing version and are ownership-scoped", async () => {
  const value = profiles.vendor.get(VP); delete value.verificationVersion;
  assert.equal((await edit("vendor", { tagline: "New tagline" })).status, 200); assert.equal(value.verificationVersion, 1);
  assert.equal(writes[0].filter.userId, VENDOR); assert.equal(writes[0].filter._id, VP);
  assert.equal((await request("/vendor/update/me", { auth: token(CLIENT), method: "PUT", body: { tagline: "Forged" } })).status, 403);
});
test("owner saves racing an admin decision return 409 without overwriting verification", async () => {
  forceConflict = true; assert.equal((await edit("vendor", { businessName: "New company" })).status, 409); assert.equal(profiles.vendor.get(VP).businessName, "Events & Decor"); assert.equal(writes.length, 0);
});
test("public profile APIs expose the trusted badge but never decision notes, reviewer IDs, history or version", async () => {
  for (const type of ["vendor", "planner"]) {
    await decide(type); const value = profiles[type].get(profileId(type)); value.password = "Secret hash";
    for (const path of [`/${type}/all`, `/${type}/${profileId(type)}`, type === "vendor" ? "/vendor/category/Decor%20%26%20Ambience" : "/planner/specialization/Wedding"]) {
      const result = await request(path, { auth: null }); assert.equal(result.status, 200); const data = Array.isArray(result.body.data) ? result.body.data[0] : result.body.data; assert.equal(data.verified, true);
      for (const key of ["verificationReason", "verificationHistory", "verificationVersion", "verifiedBy", "approvedBy", "password", "verification", "verificationStatus"]) assert.equal(Object.hasOwn(data, key), false);
    }
  }
});
test("owners can see their decision reason without private history or staff metadata", async () => {
  await decide("vendor", { action: "reject", reason: "Provide a current contact number" });
  const result = await request("/vendor/me", { auth: token(VENDOR) }); assert.equal(result.status, 200); assert.equal(result.body.data.verification.reason, "Provide a current contact number");
  for (const key of ["verificationHistory", "verifiedBy", "approvedBy", "verificationVersion", "password"]) assert.equal(Object.hasOwn(result.body.data, key), false);
});
test("image and gallery uploads invalidate older admin review versions without exposing private metadata", async () => {
  for (const type of ["vendor", "planner"]) {
    await decide(type); const value = profiles[type].get(profileId(type));
    for (const endpoint of ["test-image", "test-gallery"]) {
      const result = await request(`/${type}/${endpoint}`, { auth: token(ownerId(type)), method: "POST" }); assert.equal(result.status, 200);
      const data = result.body.data[type]; assert.equal(Object.hasOwn(data, "verificationHistory"), false); assert.equal(Object.hasOwn(data, "verifiedBy"), false);
    }
    assert.equal(value.verificationVersion, 3); assert.equal(value.verified, true); assert.equal((await decide(type, { action: "revoke", expectedVersion: 1 })).status, 409);
  }
});
test("verification database failures are bounded and do not disclose internal credentials", async () => {
  failDatabase = true;
  const list = await request("/admin/verification"); const detail = await request(`/admin/verification/vendor/${VP}`); const write = await decide();
  for (const result of [list, detail, write]) { assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("Private database credentials")); }
  assert.equal(writes.length, 0);
});
test("the mounted vendor editor preserves owner verification and saves identity using actual API field names", async () => {
  const { vendorProfileForEditor, vendorVerificationFields } = await import("../../frontend/src/utils/vendorProfileData.js");
  await decide();
  const response = await request("/vendor/me", { auth: token(VENDOR) });
  const draft = vendorProfileForEditor(response.body.data);
  assert.equal(draft.name, "Events & Decor"); assert.equal(draft.phone, "08012345678"); assert.equal(draft.verification.status, "verified");
  draft.name = "Updated Events Company"; draft.phone = "08077777777";
  const saved = await edit("vendor", vendorVerificationFields(draft)); assert.equal(saved.status, 200);
  const updated = vendorProfileForEditor(saved.body.data);
  assert.equal(updated.name, draft.name); assert.equal(updated.phone, draft.phone); assert.equal(updated.verified, false); assert.equal(updated.verification.status, "unverified");
});

test("verification schema validates states and references real user accounts", () => {
  for (const Model of [VendorProfile, PlannerProfile]) {
    assert.equal(Model.schema.path("verifiedBy").options.ref, "User"); assert.equal(Model.schema.path("verificationHistory").options.select, false);
    const value = new Model({ verificationStatus: "invented", verificationReason: "x".repeat(1001) }); assert.ok(value.validateSync().errors.verificationStatus); assert.ok(value.validateSync().errors.verificationReason);
  }
  assert.equal(VendorProfile.schema.path("approvedBy").options.ref, "User");
  assert.equal(verification.status({ verified: true, verificationStatus: "unverified" }), "verified");
});

const contentPath = (type = "vendor") => `/admin/content/${type}/${profileId(type)}`;
const moderate = (type = "vendor", body = {}, auth = token()) => request(contentPath(type), { auth, body: { action: "hide", expectedVersion: 0, reason: "Misleading profile content", ...body } });

test("content routes enforce current staff roles and separate read from manage grants", async () => {
  for (const auth of [null, token(CLIENT), token(VENDOR), token(MOD)]) {
    const expected = auth ? 403 : 401;
    assert.equal((await request("/admin/content", { auth })).status, expected);
    assert.equal((await request(contentPath(), { auth })).status, expected);
    assert.equal((await moderate("vendor", {}, auth)).status, expected);
  }
  const mod = users.get(MOD); mod.moderatorPermissions = ["content.read"];
  assert.equal((await request(contentPath(), { auth: token(MOD) })).body.data.canManage, false);
  assert.equal((await moderate("vendor", {}, token(MOD))).status, 403);
  mod.moderatorPermissions.push("content.manage");
  assert.equal((await moderate("vendor", {}, token(MOD))).status, 200);
  mod.authVersion = 1; assert.equal((await request("/admin/content", { auth: token(MOD) })).status, 401);
});

test("content queues apply visibility, literal search, pagination and current owner scope", async () => {
  profiles.vendor.set(OTHER, makeProfile("vendor", { _id: OTHER, businessName: "Other listing", active: false }));
  profiles.vendor.set(MOD, makeProfile("vendor", { _id: MOD, userId: MOD }));
  assert.equal((await request("/admin/content?status=published")).body.data.pagination.total, 1);
  assert.equal((await request("/admin/content?status=hidden")).body.data.profiles[0]._id, OTHER);
  assert.equal((await request("/admin/content?search=.*")).body.data.pagination.total, 0);
  const page = await request("/admin/content?page=999&pageSize=1"); assert.equal(page.body.data.pagination.page, 2); assert.equal(page.body.data.profiles.length, 1);
  users.get(VENDOR).archivedAt = new Date().toISOString(); assert.equal((await request("/admin/content")).body.data.pagination.total, 0);
  assert.equal((await request(contentPath())).status, 404);
  assert.equal(page.headers.get("cache-control"), "no-store");
});

test("content DTOs expose published fields and bounded history without account or verification secrets", async () => {
  const p = profiles.vendor.get(VP); p.password = "Secret hash"; p.verificationReason = "Secret verification"; p.contentReason = "Review this claim"; p.details = { services: "Submitted description" };
  p.contentHistory = Array.from({ length: 105 }, (_, i) => ({ _id: i, action: "hide", at: new Date().toISOString(), by: ADMIN, reason: `Reason ${i}` }));
  const result = await request(contentPath()); const data = result.body.data;
  assert.equal(result.status, 200); assert.equal(data.content.details.services, "Submitted description"); assert.equal(data.moderation.history.length, 100); assert.equal(data.moderation.history[0].reason, "Reason 104");
  assert.ok(!JSON.stringify(result.body).includes("Secret"));
  assert.equal(Object.hasOwn(data.content, "userId"), false); assert.equal(Object.hasOwn(data.owner, "email"), false);
});

test("hiding and restoring both profile types preserves content and badges while enforcing public routes", async () => {
  for (const type of ["vendor", "planner"]) {
    const p = profiles[type].get(profileId(type)); p.verified = true; p.profileImage = "uploads/avatar.jpg"; p.gallery = ["uploads/gallery.jpg"];
    const content = clone(p);
    const hidden = await moderate(type); assert.equal(hidden.status, 200); assert.equal(hidden.body.data.moderation.hidden, true); assert.equal(p.verified, true); assert.equal(p.profileImage, content.profileImage); assert.deepEqual(p.gallery, content.gallery);
    assert.equal((await request(`/${type}/all`, { auth: null })).body.data.length, 0);
    assert.equal((await request(`/${type}/${profileId(type)}`, { auth: null })).status, 404);
    const filtered = type === "vendor" ? "/vendor/category/Decor%20%26%20Ambience" : "/planner/specialization/Wedding";
    assert.equal((await request(filtered, { auth: null })).status, 404);
    const restored = await moderate(type, { action: "restore", expectedVersion: 1, reason: "Corrected content reviewed" }); assert.equal(restored.status, 200);
    assert.equal((await request(`/${type}/${profileId(type)}`, { auth: null })).status, 200);
    assert.deepEqual(p.contentHistory.map((entry) => entry.action), ["hide", "restore"]); assert.equal(p.contentHistory[0].by, ADMIN);
  }
});

test("owner edits cannot unhide a listing or replace reasons and private history", async () => {
  for (const type of ["vendor", "planner"]) {
    await moderate(type);
    const edited = await edit(type, { tagline: "Corrected content", active: true, contentReason: "Fake", contentHistory: [], contentAt: null, contentModeration: { hidden: false } });
    assert.equal(edited.status, 200); assert.equal(edited.body.data.contentModeration.hidden, true); assert.equal(edited.body.data.contentModeration.reason, "Misleading profile content");
    const p = profiles[type].get(profileId(type)); assert.equal(p.contentHistory.length, 1); assert.equal(Object.hasOwn(edited.body.data, "contentHistory"), false);
    assert.equal((await moderate(type, { action: "restore", expectedVersion: 1 })).status, 409);
    assert.equal((await moderate(type, { action: "restore", expectedVersion: 2 })).status, 200);
    const publicResponse = await request(`/${type}/${profileId(type)}`, { auth: null });
    for (const key of ["contentReason", "contentAt", "contentHistory", "contentModeration"]) assert.equal(Object.hasOwn(publicResponse.body.data, key), false);
  }
});

test("hidden listings stay hidden during uploads, and uploads invalidate stale restoration reviews", async () => {
  for (const type of ["vendor", "planner"]) {
    await moderate(type);
    for (const endpoint of ["test-image", "test-gallery"]) {
      const result = await request(`/${type}/${endpoint}`, { auth: token(ownerId(type)), method: "POST" }); assert.equal(result.status, 200); assert.equal(result.body.data[type].contentModeration.hidden, true);
    }
    assert.equal((await moderate(type, { action: "restore", expectedVersion: 1 })).status, 409);
    assert.equal(profiles[type].get(profileId(type)).active, false);
  }
});

test("hidden listings cannot be deleted and recreated to bypass moderation", async () => {
  for (const type of ["vendor", "planner"]) {
    await moderate(type);
    assert.equal((await request(`/${type}/delete/me`, { method: "DELETE", auth: token(ownerId(type)) })).status, 409);
    assert.equal((await request(`/${type}/me`, { auth: token(ownerId(type)) })).body.data.contentModeration.hidden, true);
    assert.equal(profiles[type].size, 1);
    await moderate(type, { action: "restore", expectedVersion: 1 });
    editDuringWrite = true;
    assert.equal((await request(`/${type}/delete/me`, { method: "DELETE", auth: token(ownerId(type)) })).status, 409); editDuringWrite = false;
  }
});

test("content transitions reject stale, repeated and racing actions including verification conflicts", async () => {
  assert.equal((await moderate("vendor", { action: "restore" })).status, 409);
  await decide(); assert.equal((await moderate()).status, 409);
  assert.equal((await moderate("vendor", { expectedVersion: 1 })).status, 200);
  assert.equal((await moderate("vendor", { expectedVersion: 2 })).status, 409);
  editDuringWrite = true; assert.equal((await moderate("vendor", { action: "restore", expectedVersion: 2 })).status, 409);
  assert.equal(profiles.vendor.get(VP).active, false);
});

test("content validation rejects unsafe filters, unsupported actions and injected metadata", async () => {
  for (const query of ["type=client", "type=__proto__", "status=invalid", "search[$ne]=x", "page=-1", "pageSize=101", "unknown=x"]) assert.equal((await request(`/admin/content?${query}`)).status, 400);
  for (const body of [{ action: "delete" }, { expectedVersion: "0" }, { reason: " " }, { reason: "x".repeat(1001) }, { active: true }, { $set: { active: true } }]) assert.equal((await moderate("vendor", body)).status, 400);
  assert.equal((await request("/admin/content/constructor/invalid")).status, 400); assert.equal(writes.length, 0);
  failDatabase = true;
  for (const result of [await request("/admin/content"), await request(contentPath()), await moderate()]) { assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("Private database credentials")); }
});

test("legacy content records use missing versions safely and keep only 100 decisions", async () => {
  const p = profiles.vendor.get(VP); delete p.active; delete p.verificationVersion;
  p.contentHistory = Array.from({ length: 100 }, () => ({ _id: OTHER, action: "restore", by: ADMIN, at: new Date().toISOString(), reason: "Reviewed" }));
  const result = await moderate(); assert.equal(result.status, 200); assert.equal(p.contentHistory.length, 100); assert.equal(p.verificationVersion, 1);
  assert.equal(writes[0].filter.active, null); assert.ok(writes[0].filter.$or.some((entry) => entry.verificationVersion?.$exists === false));
  for (const Model of [VendorProfile, PlannerProfile]) {
    assert.equal(Model.schema.path("contentHistory").options.select, false); assert.equal(Model.schema.path("contentReason").options.select, false);
    assert.ok(new Model({ contentReason: "x".repeat(1001) }).validateSync().errors.contentReason);
  }
});
