// Run from Backend: npm run owner:seed
const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const User = require("../src/models/user.model");
const { OwnerSeedError, readOwnerConfig, seedSiteOwner } = require("../src/services/siteOwnerSeed.service");

async function main() {
  if (process.argv.length !== 2) throw new OwnerSeedError("Usage: npm run owner:seed (credentials belong in Backend/.env).");
  const config = readOwnerConfig(process.env);
  if (!process.env.DBSTRING) throw new OwnerSeedError("DBSTRING must be configured in Backend/.env.");
  await mongoose.connect(process.env.DBSTRING, { serverSelectionTimeoutMS: 10000 });
  // Explicitly build uniqueness guards even when autoIndex is disabled.
  // Existing duplicate emails cause a safe failure before an owner is created.
  await User.createIndexes();
  const result = await seedSiteOwner(User, config);
  console.log(result.created
    ? "Site Owner created. Sign in at /login to open /admin."
    : "Site Owner already exists. Password and account details were left unchanged.");
}

if (require.main === module) {
  main().catch((error) => {
    // Driver/validation errors can include connection strings or record contents.
    console.error(error instanceof OwnerSeedError ? error.message : "Site Owner seeding failed. Check database connectivity, permissions, and unique indexes. No credentials were logged.");
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}

module.exports = { main };
