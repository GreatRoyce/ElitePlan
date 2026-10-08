const User = require("../models/user.model");
const Vendor = require("../models/vendorProfile.model");
const Planner = require("../models/plannerProfile.model");
const { accountStatus } = require("./accountAccess.service");
const verification = require("./profileVerification.service");
const categories = ["account_access", "profile", "technical", "billing", "other"];
const statuses = ["open", "under_review", "waiting_member", "resolved", "rejected"];
const uuidValid = (value) => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const id = (v) => String(v?._id ?? v);
const projection = "+priority +assignedTo +history +appeal.decisionBy";
const profileProjection = "+verificationVersion +verificationReason +verificationHistory +contentReason +contentHistory";
function snapshot(user, profile, kind) {
  if (kind === "account") {
    const status = accountStatus(user);
    return { kind, targetId: user._id, targetType: "account", version: user.moderationVersion ?? 0, status, reason: status === "archived" ? user.archiveReason || null : user.moderationReason || null, decisionBy: status === "archived" ? user.archivedBy || null : user.moderatedBy || null };
  }
  return { kind, targetId: profile._id, targetType: user.role, version: profile.verificationVersion ?? 0, status: kind === "listing" ? profile.active === false ? "hidden" : "published" : verification.status(profile), reason: kind === "listing" ? profile.contentReason || null : profile.verificationReason || null, decisionBy: kind === "listing" ? profile.contentHistory?.at(-1)?.by || null : profile.verificationHistory?.at(-1)?.by || null };
}
async function appealOptions(user) {
  const result = [];
  if (accountStatus(user) !== "active") result.push(snapshot(user, null, "account"));
  const Model = { vendor: Vendor, planner: Planner }[user.role];
  if (Model) {
    const profile = await Model.findOne({ userId: user._id }).select(profileProjection).lean();
    if (profile?.active === false) result.push(snapshot(user, profile, "listing"));
    if (profile && ["rejected", "revoked"].includes(verification.status(profile))) result.push(snapshot(user, profile, "verification"));
  }
  return result;
}
const publicAppeal = (a) => a?.kind ? { kind: a.kind, targetId: a.targetId, targetType: a.targetType, version: a.version, status: a.status, reason: a.reason || null } : null;
function summary(ticket, staff = false, detail = false) {
  return {
    _id: ticket._id, type: ticket.type, category: ticket.category, subject: ticket.subject, status: ticket.status, outcome: ticket.outcome || null, resolution: ticket.resolution || null, closedAt: ticket.closedAt || null, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, version: ticket.version ?? 0, appeal: publicAppeal(ticket.appeal),
    ...(detail ? { details: ticket.details, messages: (ticket.messages || []).map((m) => ({ _id: m._id, from: m.from, text: m.text, at: m.at })) } : {}),
    ...(staff ? { owner: ticket.owner, priority: ticket.priority || "normal", assignedTo: ticket.assignedTo || null, ...(detail ? { history: (ticket.history || []).slice(-100).reverse().map((h) => ({ _id: h._id, action: h.action, by: h.by, note: h.note, at: h.at })), decisionBy: ticket.appeal?.decisionBy || null } : {}) } : {}),
  };
}
async function currentAppeal(ticket) {
  if (ticket.type !== "appeal") return null;
  const user = await User.findById(ticket.owner).select("_id username role archivedAt archivedBy archiveReason moderationVersion accountStatus suspendedUntil moderationReason moderatedBy").lean();
  if (!user) return { missing: true, remedied: false };
  const kind = ticket.appeal.kind;
  if (kind === "account") return { ...publicAppeal(snapshot(user, null, kind)), missing: false, remedied: accountStatus(user) === "active" };
  const Model = { vendor: Vendor, planner: Planner }[ticket.appeal.targetType];
  const profile = Model ? await Model.findById(ticket.appeal.targetId).select(profileProjection).lean() : null;
  if (!profile || id(profile.userId) !== id(ticket.owner) || user.role !== ticket.appeal.targetType) return { missing: true, remedied: false };
  return { ...publicAppeal(snapshot(user, profile, kind)), missing: false, remedied: kind === "listing" ? profile.active !== false : profile.verified === true };
}
function parseQuery(query, staff) {
  if (Object.keys(query).some((key) => !(staff ? ["status", "type", "priority", "assigned", "page", "pageSize"] : ["status", "page", "pageSize"]).includes(key)) || Object.values(query).some((v) => typeof v !== "string")) return null;
  const status = query.status || "all", page = query.page === undefined ? 1 : Number(query.page), pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if (status !== "all" && !statuses.includes(status) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || ["page", "pageSize"].some((key) => query[key] !== undefined && !/^\d+$/.test(query[key]))) return null;
  const filter = status === "all" ? {} : { status };
  if (staff) {
    for (const [key, options] of [["type", ["support", "appeal"]], ["priority", ["normal", "urgent"]], ["assigned", ["mine", "unassigned"]]]) {
      const value = query[key] || "all";
      if (value !== "all" && !options.includes(value)) return null;
      if (value !== "all" && key !== "assigned") filter[key] = value;
    }
  }
  return { filter, status, page, pageSize };
}
module.exports = { categories, statuses, uuidValid, id, projection, appealOptions, publicAppeal, summary, currentAppeal, parseQuery };
