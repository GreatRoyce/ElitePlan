const mongoose = require("mongoose");
const User = require("../models/user.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");
const { accountStatus } = require("../services/accountAccess.service");
const verification = require("../services/profileVerification.service");

const models = { vendor: VendorProfile, planner: PlannerProfile };
const fail = (res, error) => { console.error("Profile verification failed:", error.message); return res.status(500).json({ success: false, message: "Unable to process profile verification. Please try again." }); };
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
function parseQuery(query) {
  if (Object.keys(query).some((key) => !["type", "status", "search", "page", "pageSize", "sort"].includes(key)) || Object.values(query).some((value) => typeof value !== "string")) return null;
  const type = query.type || "vendor"; const status = query.status || "unverified"; const search = (query.search || "").trim(); const sort = query.sort || "oldest";
  const page = query.page === undefined ? 1 : Number(query.page); const pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if (!Object.hasOwn(models, type) || !["all", "unverified", "verified", "rejected", "revoked"].includes(status) || search.length > 100 || !["oldest", "newest"].includes(sort) || (query.page !== undefined && !/^\d+$/.test(query.page)) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || (query.pageSize !== undefined && !/^\d+$/.test(query.pageSize)) || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
  return { type, status, search, sort, page, pageSize };
}
function queuePipeline(options) {
  const filter = options.status === "all" ? {} : options.status === "verified" ? { verified: true } : options.status === "unverified" ? { verified: { $ne: true }, verificationStatus: { $nin: ["rejected", "revoked"] } } : { verified: { $ne: true }, verificationStatus: options.status };
  const pipeline = [
    { $match: filter },
    { $lookup: { from: User.collection.name, localField: "userId", foreignField: "_id", as: "owner" } },
    { $unwind: "$owner" },
    { $match: { "owner.role": options.type, "owner.archivedAt": null } },
  ];
  if (options.search) {
    const literal = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pipeline.push({ $match: { $or: ["businessName", "companyName", "fullName", "contactPerson", "email", "owner.username", "owner.email"].map((key) => ({ [key]: { $regex: literal, $options: "i" } })) } });
  }
  return pipeline;
}
async function listProfiles(req, res) {
  const options = parseQuery(req.query);
  if (!options) return res.status(400).json({ success: false, message: "Invalid verification filters." });
  try {
    const model = models[options.type]; const pipeline = queuePipeline(options);
    const [count] = await model.aggregate([...pipeline, { $count: "total" }]);
    const total = count?.total || 0; const totalPages = Math.ceil(total / options.pageSize); const page = Math.min(options.page, Math.max(totalPages, 1));
    const records = await model.aggregate([...pipeline, { $sort: { lastUpdated: options.sort === "oldest" ? 1 : -1, _id: options.sort === "oldest" ? 1 : -1 } }, { $skip: (page - 1) * options.pageSize }, { $limit: options.pageSize }, { $project: { _id: 1, businessName: 1, companyName: 1, fullName: 1, contactPerson: 1, email: 1, phonePrimary: 1, verified: 1, verificationStatus: 1, lastUpdated: 1, "owner._id": 1, "owner.username": 1, "owner.accountStatus": 1, "owner.suspendedUntil": 1 } }]);
    return res.json({ success: true, data: { profiles: records.map((profile) => ({ _id: profile._id, type: options.type, organization: profile.businessName || profile.companyName || null, name: profile.fullName || profile.contactPerson || null, email: profile.email || null, status: verification.status(profile), updatedAt: profile.lastUpdated || null, owner: { _id: profile.owner._id, username: profile.owner.username, accountStatus: accountStatus(profile.owner) } })), filters: { type: options.type, status: options.status, search: options.search, sort: options.sort }, pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function loadProfile(type, profileId) {
  const profile = await models[type].findById(profileId).select(verification.adminProjection).lean();
  if (!profile) return null;
  const owner = await User.findById(profile.userId).select("_id username email role accountStatus suspendedUntil archivedAt").lean();
  if (!owner || owner.role !== type || owner.archivedAt) return null;
  return { profile, owner };
}
function detail(profile, owner, type) {
  const missing = verification.missingFields(profile, type);
  return {
    profile: { _id: profile._id, type, organization: profile.businessName || profile.companyName || null, name: profile.fullName || profile.contactPerson || null, email: profile.email || null, phone: profile.phonePrimary || null, bio: profile.description || profile.shortBio || null, category: profile.category || null, specialization: profile.specialization || [], yearsExperience: profile.yearsExperience ?? null, location: { address: profile.address || null, city: profile.city || null, state: profile.state || null, country: profile.country || null }, website: profile.website || null, socialLinks: profile.socialLinks || {}, certifications: profile.certifications || [], serviceRegions: profile.serviceRegions || [], profileImage: profile.profileImage || null, gallery: profile.gallery || [], portfolioImages: profile.portfolioImages || [], updatedAt: profile.lastUpdated || null },
    owner: { _id: owner._id, username: owner.username, email: owner.email, role: owner.role, accountStatus: accountStatus(owner) },
    verification: verification.summary(profile, true), eligibility: { canApprove: missing.length === 0 && accountStatus(owner) === "active", missingFields: missing },
  };
}
async function getProfile(req, res) {
  const { type, profileId } = req.params;
  if (!Object.hasOwn(models, type) || !verification.idValid(profileId)) return res.status(400).json({ success: false, message: "Invalid professional profile." });
  try { const result = await loadProfile(type, profileId); if (!result) return res.status(404).json({ success: false, message: "Professional profile not available for verification." }); return res.json({ success: true, data: detail(result.profile, result.owner, type) }); }
  catch (error) { return fail(res, error); }
}
async function verifyProfile(req, res) {
  const { type, profileId } = req.params; const body = req.body;
  if (!Object.hasOwn(models, type) || !verification.idValid(profileId) || !body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ success: false, message: "Invalid verification action." });
  const { action, expectedVersion } = body; const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (Object.keys(body).some((key) => !["action", "expectedVersion", "reason"].includes(key)) || !["approve", "reject", "revoke"].includes(action) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || !reason || reason.length > 1000) return res.status(400).json({ success: false, message: "Choose a supported action and provide the current version and a reason (1–1000 characters)." });
  try {
    const result = await loadProfile(type, profileId);
    if (!result) return res.status(404).json({ success: false, message: "Professional profile not available for verification." });
    const { profile, owner } = result; const current = verification.status(profile);
    if (String(owner._id) === String(req.user._id)) return res.status(403).json({ success: false, message: "Another admin must review your profile." });
    if ((profile.verificationVersion ?? 0) !== expectedVersion) return res.status(409).json({ success: false, message: "The profile has changed. Refresh and review its current details." });
    if (action === "approve" && (current === "verified" || verification.missingFields(profile, type).length || accountStatus(owner) !== "active")) return res.status(409).json({ success: false, message: "Only complete profiles belonging to active accounts can be approved. Refresh its details." });
    if (action === "revoke" && current !== "verified" || action === "reject" && current !== "unverified") return res.status(409).json({ success: false, message: "This verification action does not apply to the current profile status." });
    const now = new Date(); const status = { approve: "verified", reject: "rejected", revoke: "revoked" }[action];
    const updated = await models[type].findOneAndUpdate({ _id: profile._id, userId: owner._id, verified: profile.verified ?? null, ...verification.versionFilter(profile) }, {
      $set: { verified: action === "approve", verificationStatus: status, verificationReason: reason, verificationAt: now, verifiedBy: action === "approve" ? req.user._id : null, verifiedAt: action === "approve" ? now : null, ...(type === "vendor" ? { approvedBy: action === "approve" ? req.user._id : null, dateApproved: action === "approve" ? now : null } : {}) },
      $inc: { verificationVersion: 1 },
      $push: { verificationHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action, by: req.user._id, at: now, reason, status }], $slice: -100 } },
    }, { new: true, runValidators: true }).select(verification.adminProjection).lean();
    if (!updated) return res.status(409).json({ success: false, message: "The profile has changed. Refresh and review its current details." });
    return res.json({ success: true, message: `Profile ${status}.`, data: detail(updated, owner, type) });
  } catch (error) { return fail(res, error); }
}
module.exports = { listProfiles, getProfile, verifyProfile, noStore, parseQuery, queuePipeline };
