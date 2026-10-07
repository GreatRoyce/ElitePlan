// Run from Backend: npm run admin:bootstrap -- admin@example.com
const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const User = require("../src/models/user.model");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || process.argv.length !== 3) {
    throw new Error("Usage: npm run admin:bootstrap -- <existing-account-email>");
  }
  if (!process.env.DBSTRING) throw new Error("DBSTRING must be configured in Backend/.env.");
  await mongoose.connect(process.env.DBSTRING, { serverSelectionTimeoutMS: 10000 });
  if (await User.exists({ role: "admin" })) {
    throw new Error("An admin already exists. This command only provisions the first admin.");
  }
  const user = await User.findOneAndUpdate(
    { email, role: { $in: ["client", "vendor", "planner"] } },
    { $set: { role: "admin" } },
    { new: true, runValidators: true },
  );
  if (!user) throw new Error("Account not found. Register a dedicated staff account first.");
  console.log("First admin assigned. Sign out and sign in again to open /admin.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
