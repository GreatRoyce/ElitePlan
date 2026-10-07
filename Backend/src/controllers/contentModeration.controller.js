const mongoose = require("mongoose");
const User = require("../models/user.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");
const verification = require("../services/profileVerification.service");
const { accountStatus } = require("../services/accountAccess.service");
const { hasPermission } = require("../services/staffAccess.service");
const models = { vendor: VendorProfile, planner: PlannerProfile };
const projection = "+verificationVersion +contentReason +contentHistory";
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const fail = (res, error) => { console.error("Content moderation failed:", error.message); return res.status(500).json({ success: false, message: "Unable to process content moderation. Please try again." }); };

function parseQuery(query) {
  if (Object.keys(query).some((key) => !["type", "status", "search", "page", "pageSize"].includes(key)) || Object.values(query).some((value) => typeof value !== "string")) return null;
  const type = query.type || "vendor", status = query.status || "all", search = (query.search || "").trim();
  const page = query.page === undefined ? 1 : Number(query.page), pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if (!Object.hasOwn(models, type) || !["all", "published", "hidden"].includes(status) || search.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || ["page", "pageSize"].some((key) => query[key] !== undefined && !/^\d+$/.test(query[key]))) return null;
  return { type, status, search, page, pageSize };
}
function queuePipeline(options) {
  const pipeline = [
    { $match: options.status === "hidden" ? { active: false } : options.status === "published" ? { active: { $ne: false } } : {} },
    { $lookup: { from: User.collection.name, localField: "userId", foreignField: "_id", as: "owner" } },
    { $unwind: "$owner" },
    { $match: { "owner.role": options.type, "owner.archivedAt": null } },
  ];
  if (options.search) {
    const literal = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pipeline.push({ $match: { $or: ["businessName", "companyName", "fullName", "owner.username"].map((key) => ({ [key]: { $regex: literal, $options: "i" } })) } });
  }
  return pipeline;
}
async function listProfiles(req, res) {
  const options = parseQuery(req.query);
  if (!options) return res.status(400).json({ success: false, message: "Invalid content filters." });
  try {
    const model = models[options.type], pipeline = queuePipeline(options);
    const [count] = await model.aggregate([...pipeline, { $count: "total" }]);
    const total = count?.total || 0, totalPages = Math.ceil(total / options.pageSize), page = Math.min(options.page, Math.max(totalPages, 1));
    const records = await model.aggregate([...pipeline, { $sort: { lastUpdated: -1, _id: -1 } }, { $skip: (page - 1) * options.pageSize }, { $limit: options.pageSize }, { $project: { _id: 1, businessName: 1, companyName: 1, fullName: 1, active: 1, lastUpdated: 1, "owner._id": 1, "owner.username": 1 } }]);
    return res.json({ success: true, data: { profiles: records.map((p) => ({ _id: p._id, type: options.type, name: p.businessName || p.companyName || p.fullName, hidden: p.active === false, updatedAt: p.lastUpdated || null, owner: { _id: p.owner._id, username: p.owner.username } })), filters: options, pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function load(type, id) {
  const profile = await models[type].findById(id).select(projection).lean();
  if (!profile) return null;
  const owner = await User.findById(profile.userId).select("_id username role archivedAt accountStatus suspendedUntil").lean();
  if (!owner || owner.archivedAt || owner.role !== type) return null;
  return { profile, owner };
}
function detail(profile, owner, type, reviewer) {
  return {
    profile: { _id: profile._id, type, name: profile.businessName || profile.companyName || profile.fullName, updatedAt: profile.lastUpdated || null },
    // Only published profile fields are exposed; account secrets and private messages are excluded.
    content: Object.fromEntries(verification.writableFields[type].filter((key) => Object.hasOwn(profile, key)).map((key) => [key, profile[key]])),
    reviews: type === "planner" ? (profile.reviews || []).map((entry) => ({ rating: entry.rating, comment: entry.comment, date: entry.date })) : [],
    owner: { _id: owner._id, username: owner.username, role: owner.role, accountStatus: accountStatus(owner) },
    moderation: { hidden: profile.active === false, version: profile.verificationVersion ?? 0, reason: profile.contentReason || null, at: profile.contentAt || null, history: (profile.contentHistory || []).slice(-100).reverse().map((entry) => ({ _id: entry._id, action: entry.action, by: entry.by, at: entry.at, reason: entry.reason })) },
    canManage: hasPermission(reviewer, "content.manage") && String(owner._id) !== String(reviewer._id),
  };
}
function validParams({ type, profileId }) { return Object.hasOwn(models, type) && verification.idValid(profileId); }
async function getProfile(req, res) {
  if (!validParams(req.params)) return res.status(400).json({ success: false, message: "Invalid professional profile." });
  try {
    const result = await load(req.params.type, req.params.profileId);
    if (!result) return res.status(404).json({ success: false, message: "Professional profile unavailable." });
    return res.json({ success: true, data: detail(result.profile, result.owner, req.params.type, req.user) });
  } catch (error) { return fail(res, error); }
}
async function moderate(req, res) {
  const body = req.body, { type, profileId } = req.params;
  if (!validParams(req.params) || !body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ success: false, message: "Invalid content action." });
  const { action, expectedVersion } = body, reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (Object.keys(body).some((key) => !["action", "expectedVersion", "reason"].includes(key)) || !["hide", "restore"].includes(action) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || !reason || reason.length > 1000) return res.status(400).json({ success: false, message: "Provide hide or restore, a current version, and a reason (1-1000 characters)." });
  try {
    const result = await load(type, profileId);
    if (!result) return res.status(404).json({ success: false, message: "Professional profile unavailable." });
    const { profile, owner } = result;
    if (String(owner._id) === String(req.user._id)) return res.status(403).json({ success: false, message: "Another staff member must review your profile." });
    if ((profile.verificationVersion ?? 0) !== expectedVersion || (action === "hide") === (profile.active === false)) return res.status(409).json({ success: false, message: "The listing has changed. Refresh and review its current content." });
    const now = new Date();
    const updated = await models[type].findOneAndUpdate({ _id: profile._id, userId: owner._id, active: profile.active ?? null, ...verification.versionFilter(profile) }, {
      $set: { active: action === "restore", contentReason: reason, contentAt: now },
      $inc: { verificationVersion: 1 },
      $push: { contentHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action, reason, by: req.user._id, at: now }], $slice: -100 } },
    }, { new: true, runValidators: true }).select(projection).lean();
    if (!updated) return res.status(409).json({ success: false, message: "The listing has changed. Refresh and review its current content." });
    return res.json({ success: true, message: action === "hide" ? "Listing hidden. Its content is preserved for review." : "Listing restored.", data: detail(updated, owner, type, req.user) });
  } catch (error) { return fail(res, error); }
}
module.exports = { listProfiles, getProfile, moderate, noStore, parseQuery, queuePipeline };
