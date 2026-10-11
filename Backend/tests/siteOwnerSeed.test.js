const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const { readOwnerConfig, seedSiteOwner } = require("../src/services/siteOwnerSeed.service");

const env = {
  SITE_OWNER_NAME: " Site Owner ",
  SITE_OWNER_EMAIL: " OWNER@example.com ",
  SITE_OWNER_PHONE: "+2348000000000",
  SITE_OWNER_PASSWORD: " seed-test-password#only ",
};

function database({ owner = null, emailExists = false, error } = {}) {
  const records = [];
  return {
    records,
    async findOne() { return owner; },
    async exists() { return emailExists; },
    async create(data) {
      if (error) throw error;
      const user = new User(data);
      await user.validate();
      records.push(user);
      return user;
    },
  };
}

test("owner configuration normalizes email and name while preserving password", () => {
  const config = readOwnerConfig(env);
  assert.equal(config.username, "Site Owner");
  assert.equal(config.email, "owner@example.com");
  assert.equal(config.password, env.SITE_OWNER_PASSWORD);
});

test("missing and invalid credentials fail without including their values", () => {
  for (const key of Object.keys(env)) {
    assert.throws(() => readOwnerConfig({ ...env, [key]: "" }), /Configure SITE_OWNER/);
  }
  for (const changes of [
    { SITE_OWNER_EMAIL: "invalid" },
    { SITE_OWNER_PHONE: "invalid" },
    { SITE_OWNER_NAME: "x".repeat(101) },
    { SITE_OWNER_PASSWORD: "too-short" },
    { SITE_OWNER_PASSWORD: " ".repeat(20) },
    { SITE_OWNER_PASSWORD: "x".repeat(73) },
    { SITE_OWNER_PASSWORD: "\u00e9".repeat(37) },
  ]) {
    assert.throws(() => readOwnerConfig({ ...env, ...changes }));
  }
});

test("seed creates an active Site Owner with a working bcrypt password and no member profile", async () => {
  const db = database();
  assert.deepEqual(await seedSiteOwner(db, readOwnerConfig(env)), { created: true });
  assert.equal(db.records.length, 1);
  const owner = db.records[0];
  assert.equal(owner.isSiteOwner, true);
  assert.equal(owner.role, "admin");
  assert.equal(owner.accountStatus, "active");
  assert.equal(owner.profile, undefined);
  assert.notEqual(owner.password, env.SITE_OWNER_PASSWORD);
  assert.equal(await bcrypt.compare(env.SITE_OWNER_PASSWORD, owner.password), true);
  assert.equal(await bcrypt.compare("wrong-password", owner.password), false);
});

test("rerun preserves owner credentials and restriction status without writes", async () => {
  const owner = { email: "owner@example.com", role: "admin", password: "existing-hash", accountStatus: "banned" };
  const db = database({ owner });
  db.exists = db.create = () => assert.fail("No email lookup or write should run for an existing owner");
  assert.deepEqual(await seedSiteOwner(db, readOwnerConfig(env)), { created: false });
  assert.equal(owner.password, "existing-hash");
  assert.equal(owner.accountStatus, "banned");
});

test("a different owner or an invalid owner role fails without writes", async () => {
  for (const owner of [
    { email: "another@example.com", role: "admin" },
    { email: "owner@example.com", role: "client" },
  ]) {
    const db = database({ owner });
    await assert.rejects(seedSiteOwner(db, readOwnerConfig(env)), /Site Owner already exists/);
    assert.equal(db.records.length, 0);
  }
});

test("existing member or ordinary admin email is never taken over", async () => {
  const db = database({ emailExists: true });
  await assert.rejects(seedSiteOwner(db, readOwnerConfig(env)), /already belongs to an account/);
  assert.equal(db.records.length, 0);
});

test("a concurrent uniqueness conflict fails without exposing MongoDB details", async () => {
  const db = database({ error: Object.assign(new Error("private record data"), { code: 11000 }) });
  await assert.rejects(seedSiteOwner(db, readOwnerConfig(env)), (error) => {
    assert.match(error.message, /another operation/);
    assert.doesNotMatch(error.message, /private record data/);
    return true;
  });
  assert.equal(db.records.length, 0);
});

test("database read failures never proceed to creation", async () => {
  const db = database();
  db.findOne = async () => { throw new Error("Database unavailable"); };
  await assert.rejects(seedSiteOwner(db, readOwnerConfig(env)), /Database unavailable/);
  assert.equal(db.records.length, 0);
});

test("schema limits ownership to one document and ordinary accounts default to non-owner", () => {
  const index = User.schema.indexes().find(([, options]) => options.name === "single_site_owner");
  assert.deepEqual(index[0], { isSiteOwner: 1 });
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { isSiteOwner: true });
  assert.equal(User.schema.path("isSiteOwner").options.immutable, true);
  assert.equal(new User({ role: "admin" }).isSiteOwner, false);
});

test("seeded owner signs in through the existing login with full admin role", async (t) => {
  const db = database();
  await seedSiteOwner(db, readOwnerConfig(env));
  const owner = db.records[0];
  t.mock.method(User, "findOne", async ({ email }) => email === owner.email ? owner : null);
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "site-owner-login-test-only";
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
  const { loginUser } = require("../src/controllers/auth.controller");
  let status;
  let body;
  await loginUser({ body: { email: owner.email, password: env.SITE_OWNER_PASSWORD } }, {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  });
  assert.equal(status, 200);
  assert.equal(body.user.role, "admin");
  assert.equal(body.user.isSiteOwner, true);
  assert.equal(jwt.verify(body.token, process.env.JWT_SECRET).role, "admin");
  assert.ok(body.user.permissions.includes("users.read"));
  assert.equal(body.user.password, undefined);
});
