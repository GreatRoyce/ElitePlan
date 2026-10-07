const mongoose = require("mongoose");

const identityFields = {
  vendor: ["businessName", "contactPerson", "email", "phonePrimary", "address", "city", "state", "country", "category", "website"],
  planner: ["fullName", "companyName", "email", "phonePrimary", "state", "country", "certifications"],
};
const writableFields = {
  vendor: ["businessName", "contactPerson", "email", "phonePrimary", "phoneSecondary", "alternateContact", "tagline", "profileImage", "portfolioImages", "introVideo", "gallery", "category", "subcategory", "description", "yearsExperience", "address", "city", "state", "country", "operatingHours", "priceRange", "paymentMethods", "socialLinks", "website", "whatsappLink", "details"],
  planner: ["fullName", "email", "phonePrimary", "companyName", "profileImage", "gallery", "specialization", "yearsExperience", "shortBio", "tagline", "plannerType", "country", "state", "serviceRegions", "eventTypesHandled", "languagesSpoken", "preferredVendorCategories", "certifications", "socialLinks", "ongoingProjects"],
};
const internalFields = ["verificationVersion", "verificationReason", "verificationHistory", "verifiedBy", "approvedBy", "password", "contentReason", "contentHistory", "contentAt"];
const adminProjection = "+verificationVersion +verificationReason +verificationHistory +verifiedBy +approvedBy";
const ownerProjection = "+verificationVersion +verificationReason +contentReason";
const idValid = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
function status(profile) { return profile.verified === true ? "verified" : ["rejected", "revoked"].includes(profile.verificationStatus) ? profile.verificationStatus : "unverified"; }
function versionFilter(profile) {
  return !profile.verificationVersion ? { $or: [{ verificationVersion: 0 }, { verificationVersion: { $exists: false } }] } : { verificationVersion: profile.verificationVersion };
}
function publicProfile(profile, owner = false) {
  if (!profile) return null;
  const plain = profile.toObject ? profile.toObject() : { ...profile };
  const verification = { status: status(plain), reason: plain.verificationReason || null, at: plain.verificationAt || null };
  const contentModeration = { hidden: plain.active === false, reason: plain.contentReason || null, at: plain.contentAt || null };
  for (const key of internalFields) delete plain[key];
  if (!owner) { delete plain.verificationStatus; delete plain.verificationAt; }
  delete plain.verification; // Only the server supplies the owner-facing summary.
  delete plain.contentModeration;
  return { ...plain, ...(owner ? { verification, contentModeration } : {}) };
}
function ownerUpdates(body, type) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key.startsWith("$") || key.includes("."))) return null;
  return Object.fromEntries(writableFields[type].filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
}
function comparable(value) { if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim())); return String(value ?? "").trim(); }
function ownerWrite(profile, updates, type, userId) {
  const identityChanged = identityFields[type].some((key) => Object.hasOwn(updates, key) && comparable(updates[key]) !== comparable(profile[key]));
  const reset = identityChanged && status(profile) !== "unverified";
  const now = new Date();
  const reason = "Business identity or contact details changed. An admin must review the updated profile.";
  return {
    $set: { ...updates, lastUpdated: now, ...(reset ? { verified: false, verificationStatus: "unverified", verificationReason: reason, verificationAt: now, verifiedBy: null, verifiedAt: null, ...(type === "vendor" ? { approvedBy: null, dateApproved: null } : {}) } : {}) },
    $inc: { verificationVersion: 1 },
    ...(reset ? { $push: { verificationHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action: "profile_updated", by: userId, at: now, reason, status: "unverified" }], $slice: -100 } } } : {}),
  };
}
function missingFields(profile, type) {
  const required = type === "vendor" ? { businessName: "Business name", contactPerson: "Contact person", email: "Email", phonePrimary: "Phone", state: "State", country: "Country", category: "Category" } : { fullName: "Full name", companyName: "Company name", email: "Email", phonePrimary: "Phone", state: "State", country: "Country" };
  const missing = Object.entries(required).filter(([key]) => !String(profile[key] || "").trim() || /^(n\/a|na)$/i.test(String(profile[key]).trim())).map(([, label]) => label);
  if (!missing.includes("Email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || "")) missing.push("Valid email");
  if (!missing.includes("Phone") && String(profile.phonePrimary || "").replace(/\D/g, "").length < 7) missing.push("Valid phone");
  if (type === "planner" && !profile.specialization?.length) missing.push("Specialization");
  return missing;
}
function summary(profile, history = false) {
  return { status: status(profile), version: profile.verificationVersion ?? 0, reason: profile.verificationReason || null, at: profile.verificationAt || null, verifiedBy: profile.verifiedBy || profile.approvedBy || null, verifiedAt: profile.verifiedAt || profile.dateApproved || null,
    ...(history ? { history: (profile.verificationHistory || []).slice(-100).reverse().map((entry) => ({ _id: entry._id, action: entry.action, by: entry.by, at: entry.at, reason: entry.reason, status: entry.status })) } : {}),
  };
}
module.exports = { idValid, status, versionFilter, publicProfile, ownerUpdates, ownerWrite, missingFields, summary, ownerProjection, adminProjection, writableFields };
