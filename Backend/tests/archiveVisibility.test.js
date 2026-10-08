const { test, before, beforeEach, after } = require("node:test");
require("./helpers/platformSettingsStub").install();
const assert = require("node:assert/strict");
const express = require("express");
const User = require("../src/models/user.model");
const VendorProfile = require("../src/models/vendorProfile.model");
const PlannerProfile = require("../src/models/plannerProfile.model");
const ClientProfile = require("../src/models/clientProfile.model");
const Message = require("../src/models/message.model");
const Consultation = require("../src/models/initialConsultation.model");
const Bookmark = require("../src/models/bookmark.model");
const Notification = require("../src/models/notification.model");
const vendorRoutes = require("../src/routes/profiles/vendor.routes");
const plannerRoutes = require("../src/routes/profiles/planner.routes");
const { createConsultation } = require("../src/controllers/initialConsultation.controller");
const { createMessage } = require("../src/controllers/message.controller");
const vendorController = require("../src/controllers/dashboards/vendordashboard.controller");
const plannerController = require("../src/controllers/dashboards/plannerdashboard.controller");
const { createBookmark, getMyBookmarks } = require("../src/controllers/bookmark.controller");
const { updateClientProfile, deleteClientProfile } = require("../src/controllers/profiles/clientProfile.controller");

const ACTIVE = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ARCHIVED = "bbbbbbbbbbbbbbbbbbbbbbbb";
const P1 = "cccccccccccccccccccccccc";
const P2 = "dddddddddddddddddddddddd";
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
let owners;
let profiles;
let writes;
let notifications;
let server;
let base;
const originals = [];
function stub(model, method, implementation) { originals.push([model, method, model[method]]); model[method] = implementation; }
function profileQuery(data) {
  const result = clone(data);
  const query = {
    select() { return this; },
    populate(options) {
      if (typeof options === "object" && options.path === "userId") {
        assert.deepEqual(options, { path: "userId", select: "username email", match: { archivedAt: null, role: { $in: ["client", "vendor", "planner"] } } });
        for (const profile of Array.isArray(result) ? result : result ? [result] : []) {
          const owner = owners.get(profile.userId);
          profile.userId = !owner || owner.archivedAt || !["client", "vendor", "planner"].includes(owner.role) ? null : { _id: owner._id, username: "Visible owner", email: "visible@example.com" };
        }
      } else assert.equal(options, "reviews.reviewerId");
      return this;
    },
    lean: async () => result,
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return query;
}

before(async () => {
  stub(User, "findById", (id) => ({ select: async (fields) => { assert.ok(["_id archivedAt", "_id archivedAt role"].includes(fields)); return clone(owners.get(String(id))) || null; } }));
  for (const Model of [VendorProfile, PlannerProfile]) {
    stub(Model, "find", () => profileQuery(profiles));
    stub(Model, "findById", (id) => profileQuery(profiles.find((profile) => profile._id === id) || null));
    stub(Model, "findOne", (filter) => {
      assert.ok(filter.userId); assert.deepEqual(filter.active, { $ne: false });
      return profileQuery(profiles.find((profile) => profile.userId === filter.userId && profile.active !== false) || null);
    });
  }
  stub(Message, "create", async () => { writes++; throw new Error("Unexpected message write"); });
  stub(Consultation, "create", async (body) => { writes++; return { _id: P2, ...body }; });
  stub(Notification, "create", async (body) => { notifications.push(clone(body)); return body; });
  stub(Bookmark, "create", async () => { writes++; throw new Error("Unexpected bookmark write"); });
  stub(Bookmark, "find", () => ({
    populate(options) {
      assert.deepEqual(options.populate, { path: "userId", select: "_id", match: { archivedAt: null, role: { $in: ["client", "vendor", "planner"] } } });
      assert.ok(options.select.split(" ").includes("userId"));
      assert.deepEqual(options.match, { active: { $ne: false } });
      return this;
    },
    sort: async () => profiles.map((profile) => ({ _id: `bookmark-${profile._id}`, targetId: { _id: profile._id, active: profile.active, userId: owners.get(profile.userId)?.archivedAt || !["client", "vendor", "planner"].includes(owners.get(profile.userId)?.role) ? null : { _id: profile.userId } } })),
  }));
  stub(ClientProfile, "findOneAndUpdate", async (filter) => {
    assert.deepEqual(filter, { _id: P2, user: ACTIVE });
    return null;
  });
  stub(ClientProfile, "findOneAndDelete", async (filter) => {
    assert.deepEqual(filter, { _id: P2, user: ACTIVE });
    return null;
  });
  const app = express();
  app.use(express.json());
  app.use("/vendor", vendorRoutes);
  app.use("/planner", plannerRoutes);
  // These controller checks focus on target availability after sender authentication.
  app.use((req, res, next) => { req.user = { _id: ACTIVE, id: ACTIVE, role: "client" }; next(); });
  app.post("/consultation", createConsultation);
  app.post("/message", createMessage);
  app.post("/vendor-message", vendorController.sendVendorMessage);
  app.post("/planner-message", plannerController.sendPlannerMessage);
  app.post("/bookmark", createBookmark);
  app.get("/bookmarks", getMyBookmarks);
  app.put("/client/:id", updateClientProfile);
  app.delete("/client/:id", deleteClientProfile);
  server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  owners = new Map([[ACTIVE, { _id: ACTIVE, role: "vendor" }], [ARCHIVED, { _id: ARCHIVED, role: "planner", archivedAt: "2026-10-07T12:00:00.000Z" }]]);
  profiles = [{ _id: P1, userId: ACTIVE, businessName: "Visible", companyName: "Visible", category: "Venue", specialization: ["Wedding"] }, { _id: P2, userId: ARCHIVED, businessName: "Removed", companyName: "Removed", category: "Venue", specialization: ["Wedding"] }];
  writes = 0;
  notifications = [];
});
after(async () => { await new Promise((resolve) => server.close(resolve)); for (const [model, method, original] of originals) model[method] = original; });
async function request(endpoint, method = "GET", body) {
  const response = await fetch(`${base}${endpoint}`, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}

test("public directories and category/specialization filters hide archived profiles without deleting records", async () => {
  const before = clone(profiles);
  for (const endpoint of ["/vendor/all", "/vendor/category/Venue", "/planner/all", "/planner/specialization/Wedding"]) {
    const result = await request(endpoint);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.length, 1);
    if (result.body.count !== undefined) assert.equal(result.body.count, 1);
    assert.equal(result.body.data[0]._id, P1);
  }
  assert.deepEqual(profiles, before);
});
test("direct archived profile URLs return 404 and legacy visible owners remain available", async () => {
  for (const role of ["vendor", "planner"]) {
    assert.equal((await request(`/${role}/${P2}`)).status, 404);
    assert.equal((await request(`/${role}/${P1}`)).status, 200);
  }
});
test("restoring an owner makes the same profile and saved bookmark visible again", async () => {
  assert.equal((await request("/bookmarks")).body.count, 1);
  owners.get(ARCHIVED).archivedAt = null;
  for (const role of ["vendor", "planner"]) {
    assert.equal((await request(`/${role}/all`)).body.count, 2);
    assert.equal((await request(`/${role}/${P2}`)).body.data._id, P2);
  }
  assert.equal((await request("/bookmarks")).body.count, 2);
});
test("new messages, consultations, and bookmarks reject archived targets before writing", async () => {
  for (const endpoint of ["/message", "/vendor-message", "/planner-message"]) assert.equal((await request(endpoint, "POST", { recipientId: ARCHIVED, text: "Hello" })).status, 404);
  assert.equal((await request("/consultation", "POST", { targetUser: ARCHIVED, targetType: "PlannerProfile" })).status, 404);
  for (const targetModel of ["VendorProfile", "PlannerProfile"]) assert.equal((await request("/bookmark", "POST", { targetId: P2, targetModel })).status, 404);
  assert.equal(writes, 0);
});
test("a different client cannot edit or delete a saved archived profile", async () => {
  assert.equal((await request(`/client/${P2}`, "PUT", { fullName: "Changed" })).status, 404);
  assert.equal((await request(`/client/${P2}`, "DELETE")).status, 404);
});

test("moderator appointment hides preserved profiles and bookmarks until the member role returns", async () => {
  owners.get(ARCHIVED).archivedAt = null;
  owners.get(ARCHIVED).role = "moderator";
  for (const role of ["vendor", "planner"]) {
    assert.equal((await request(`/${role}/all`)).body.data.length, 1);
    assert.equal((await request(`/${role}/${P2}`)).status, 404);
  }
  assert.equal((await request("/bookmarks")).body.count, 1);
  assert.equal((await request("/bookmark", "POST", { targetId: P2, targetModel: "PlannerProfile" })).status, 404);
  assert.equal((await request("/consultation", "POST", { targetUser: ARCHIVED, targetType: "PlannerProfile" })).status, 404);
  assert.equal(writes, 0);
  owners.get(ARCHIVED).role = "planner";
  assert.equal((await request(`/planner/${P2}`)).status, 200);
  assert.equal((await request("/bookmarks")).body.count, 2);
});

test("hidden content disappears from bookmarks and cannot receive new bookmarks or consultations", async () => {
  profiles[0].active = false;
  assert.equal((await request("/bookmarks")).body.count, 0);
  for (const targetModel of ["VendorProfile", "PlannerProfile"]) assert.equal((await request("/bookmark", "POST", { targetId: P1, targetModel })).status, 404);
  assert.equal((await request("/consultation", "POST", { targetUser: ACTIVE, targetType: "VendorProfile" })).status, 404);
  assert.equal(writes, 0); assert.equal(notifications.length, 0);
  profiles[0].active = true;
  assert.equal((await request("/bookmarks")).body.count, 1);
  const restored = await request("/consultation", "POST", { targetUser: ACTIVE, targetType: "VendorProfile", fullName: "Client" });
  assert.equal(restored.status, 201); assert.equal(restored.body.consultation.user, ACTIVE); assert.equal(restored.body.consultation.status, "pending");
  assert.equal(notifications[0].user, P1); assert.equal(notifications[0].userModel, "VendorProfile");
});

test("new consultations reject missing listings and mismatched target types before writes", async () => {
  assert.equal((await request("/consultation", "POST", { targetUser: ACTIVE, targetType: "PlannerProfile" })).status, 400);
  profiles = profiles.filter((profile) => profile.userId !== ACTIVE);
  assert.equal((await request("/consultation", "POST", { targetUser: ACTIVE, targetType: "VendorProfile" })).status, 404);
  assert.equal(writes, 0);
});
