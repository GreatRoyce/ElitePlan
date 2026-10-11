const bcrypt = require("bcryptjs");
const validator = require("validator");

class OwnerSeedError extends Error {}

function readOwnerConfig(env) {
  const username = env.SITE_OWNER_NAME?.trim();
  const email = env.SITE_OWNER_EMAIL?.trim().toLowerCase();
  const phone = env.SITE_OWNER_PHONE?.trim();
  // Preserve intentional spaces in passwords.
  const password = env.SITE_OWNER_PASSWORD;
  if (!username || !email || !phone || !password) {
    throw new OwnerSeedError("Configure SITE_OWNER_NAME, SITE_OWNER_EMAIL, SITE_OWNER_PHONE, and SITE_OWNER_PASSWORD in Backend/.env.");
  }
  if (username.length > 100 || !validator.isEmail(email) || email.length > 254 || !/^\+?[0-9][0-9 ()-]{5,29}$/.test(phone)) {
    throw new OwnerSeedError("Provide a name (up to 100 characters), valid email, and valid phone number for the Site Owner.");
  }
  if (password.trim().length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new OwnerSeedError("SITE_OWNER_PASSWORD must contain at least 12 non-padding characters and at most 72 UTF-8 bytes.");
  }
  return { username, email, phone, password };
}

async function seedSiteOwner(User, config) {
  const owner = await User.findOne({ isSiteOwner: true });
  if (owner) {
    if (owner.email !== config.email || owner.role !== "admin") {
      throw new OwnerSeedError("A Site Owner already exists with a different email or invalid role. No account was changed.");
    }
    return { created: false };
  }
  // Never take over an existing member or staff account by matching its email.
  if (await User.exists({ email: config.email })) {
    throw new OwnerSeedError("That email already belongs to an account. Use a dedicated Site Owner email; no account was changed.");
  }
  const password = await bcrypt.hash(config.password, 10);
  try {
    await User.create({
      username: config.username,
      email: config.email,
      phone: config.phone,
      password,
      role: "admin",
      isSiteOwner: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new OwnerSeedError("The Site Owner or email was created by another operation. No existing account was changed; rerun to check the owner.");
    }
    throw error;
  }
  return { created: true };
}

module.exports = { OwnerSeedError, readOwnerConfig, seedSiteOwner };
