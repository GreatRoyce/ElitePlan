const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const Event = require("../src/models/event.model");
const Consultation = require("../src/models/initialConsultation.model");
const VendorProfile = require("../src/models/vendorProfile.model");
const PlannerProfile = require("../src/models/plannerProfile.model");
const { registerUser } = require("../src/controllers/auth.controller");
const adminRouter = require("../src/routes/admin.routes");

const secret = "admin-tests-only-secret";
const originalSecret = process.env.JWT_SECRET;
const originalMethods = [];
let server;
let baseURL;
let currentUser;
let queryCalls;
let failDatabase;
let emptyDatabase;

function stub(model, method, implementation) {
  originalMethods.push([model, method, model[method]]);
  model[method] = implementation;
}

before(async () => {
  process.env.JWT_SECRET = secret;
  stub(User, "findById", (id) => ({
    select: async (projection) => {
      assert.equal(projection, "-password");
      assert.equal(id, "test-user");
      return currentUser;
    },
  }));
  stub(User, "aggregate", async () => {
    queryCalls += 1;
    if (failDatabase) throw new Error("Database unavailable");
    return emptyDatabase ? [] : [{ _id: "client", count: 3 }, { _id: "vendor", count: 2 }, { _id: "admin", count: 1 }];
  });
  stub(User, "countDocuments", async (filter) => {
    assert.deepEqual(filter.role, { $in: ["client", "vendor", "planner"] });
    const age = Date.now() - filter.createdAt.$gte.getTime();
    assert.ok(age >= 7 * 86400000 && age < 7 * 86400000 + 5000);
    return emptyDatabase ? 0 : 2;
  });
  stub(User, "find", (filter) => {
    assert.deepEqual(filter, { role: { $in: ["client", "vendor", "planner"] } });
    return {
      select(projection) {
        assert.equal(projection, "_id username role createdAt");
        return this;
      },
      sort(order) {
        assert.deepEqual(order, { createdAt: -1, _id: -1 });
        return this;
      },
      limit(limit) {
        assert.equal(limit, 8);
        return this;
      },
      async lean() {
        return emptyDatabase ? [] : [{ _id: "member-1", username: "A member", role: "client", createdAt: "2026-10-01T12:00:00.000Z" }];
      },
    };
  });
  stub(Event, "aggregate", async () => emptyDatabase ? [] : [{ _id: "Upcoming", count: 4 }, { _id: "Cancelled", count: 1 }]);
  stub(Consultation, "aggregate", async () => emptyDatabase ? [] : [{ _id: "pending", count: 2 }, { _id: "approved", count: 3 }]);
  stub(VendorProfile, "countDocuments", async (filter) => {
    assert.deepEqual(filter, { verified: { $ne: true } });
    return emptyDatabase ? 0 : 2;
  });
  stub(PlannerProfile, "countDocuments", async (filter) => {
    assert.deepEqual(filter, { verified: { $ne: true } });
    return 0;
  });
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", adminRouter);
  app.post("/api/v1/auth/register", registerUser);
  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;
});

beforeEach(() => {
  currentUser = { _id: "test-user", role: "admin" };
  queryCalls = 0;
  failDatabase = false;
  emptyDatabase = false;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const [model, method, original] of originalMethods) model[method] = original;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

function token(role = "admin", expiresIn = "5m") {
  return jwt.sign({ id: "test-user", role }, secret, { expiresIn });
}

async function overview(authToken) {
  const response = await fetch(`${baseURL}/admin/overview`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  return { status: response.status, body: await response.json() };
}

test("admin role is valid in the schema, but public signup refuses staff roles", async () => {
  const user = new User({ username: "Staff", email: "staff@example.com", phone: "123", password: "hashed", role: "admin" });
  assert.equal(user.validateSync(), undefined);
  for (const role of ["admin", "moderator"]) {
    const response = await fetch(`${baseURL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Staff", email: "staff@example.com", phone: "123", password: "password", role }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "Invalid role");
  }
});

test("missing, invalid, and expired tokens cannot access the overview", async () => {
  for (const authToken of [undefined, "invalid-token", token("admin", -1)]) {
    assert.equal((await overview(authToken)).status, 401);
    assert.equal(queryCalls, 0);
  }
});

test("client, vendor, and planner accounts are denied even with an admin token claim", async () => {
  for (const role of ["client", "vendor", "planner"]) {
    currentUser.role = role;
    assert.equal((await overview(token("admin"))).status, 403);
    assert.equal(queryCalls, 0);
  }
});

test("deleted users and revoked admin access are checked on each request", async () => {
  const authToken = token();
  assert.equal((await overview(authToken)).status, 200);
  currentUser = { _id: "test-user", role: "client" };
  assert.equal((await overview(authToken)).status, 403);
  currentUser = null;
  assert.equal((await overview(authToken)).status, 401);
  assert.equal(queryCalls, 1);
});

test("overview uses the current database role and returns correct, limited data", async () => {
  const { status, body } = await overview(token("client"));
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data.users.byRole, { client: 3, vendor: 2, planner: 0 });
  assert.equal(body.data.users.total, 5);
  assert.equal(body.data.users.adminCount, 1);
  assert.equal(body.data.users.newLast7Days, 2);
  assert.equal(body.data.users.recent.length, 1);
  assert.deepEqual(Object.keys(body.data.users.recent[0]), ["_id", "username", "role", "createdAt"]);
  assert.deepEqual(body.data.events, { total: 5, byStatus: { Upcoming: 4, Cancelled: 1 } });
  assert.deepEqual(body.data.consultations, { total: 5, byStatus: { pending: 2, approved: 3 } });
  assert.deepEqual(body.data.profiles, { unverifiedVendors: 2, unverifiedPlanners: 0 });
  assert.ok(Number.isFinite(Date.parse(body.data.generatedAt)));
});

test("an empty database returns zeros and an empty registration list", async () => {
  emptyDatabase = true;
  const { status, body } = await overview(token());
  assert.equal(status, 200);
  assert.deepEqual(body.data.users, { total: 0, byRole: { client: 0, vendor: 0, planner: 0 }, adminCount: 0, newLast7Days: 0, recent: [] });
  assert.deepEqual(body.data.events, { total: 0, byStatus: {} });
  assert.deepEqual(body.data.consultations, { total: 0, byStatus: {} });
});

test("database errors return an error without leaking internals or fabricating figures", async () => {
  failDatabase = true;
  const { status, body } = await overview(token());
  assert.equal(status, 500);
  assert.deepEqual(body, { success: false, message: "Unable to load the admin overview." });
});
