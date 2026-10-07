const User = require("../models/user.model");
const Message = require("../models/message.model");
const Consultation = require("../models/initialConsultation.model");
const ClientProfile = require("../models/clientProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");

const categories = ["harassment", "spam", "fraud", "service", "staff_conduct", "other"];
const types = ["general", "account", "message", "consultation"];
const statuses = ["open", "under_review", "resolved", "dismissed"];
const idValid = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
const id = (value) => String(value?._id ?? value);
const fields = "_id reporter type targetId targetUser targetLabel category subject details adminOnly evidence status priority assignedTo resolution resolvedAt version history createdAt updatedAt";
const listFields = "_id reporter type targetUser targetLabel category subject adminOnly status priority assignedTo resolution resolvedAt createdAt updatedAt";
const profileModels = { ClientProfile: { model: ClientProfile, key: "user" }, VendorProfile: { model: VendorProfile, key: "userId" }, PlannerProfile: { model: PlannerProfile, key: "userId" } };

async function participantOwner(participant, model) {
  if (model === "User") return id(participant);
  const config = profileModels[model];
  if (!config) return null;
  const profile = await config.model.findById(participant).select(config.key).lean();
  return profile?.[config.key] ? id(profile[config.key]) : null;
}
async function reportContext(type, targetId, reporter) {
  if (type === "general") return { targetId: null, targetUser: null, targetLabel: "Site complaint", adminOnly: false, evidence: {} };
  let targetUser = targetId;
  let evidence = {};
  if (type === "message") {
    const message = await Message.findById(targetId).select("sender senderModel recipient recipientModel text createdAt").lean();
    if (!message) return null;
    const [sender, recipient] = await Promise.all([participantOwner(message.sender, message.senderModel), participantOwner(message.recipient, message.recipientModel)]);
    if (id(reporter) !== sender && id(reporter) !== recipient) return null;
    if (id(reporter) === sender) return null;
    targetUser = sender;
    evidence = { text: String(message.text || "").slice(0, 5000), sentAt: message.createdAt };
  }
  if (type === "consultation") {
    const consultation = await Consultation.findById(targetId).select("user targetUser eventType eventDate status").lean();
    if (!consultation || ![id(consultation.user), id(consultation.targetUser)].includes(id(reporter))) return null;
    targetUser = id(consultation.user) === id(reporter) ? id(consultation.targetUser) : id(consultation.user);
    evidence = { eventType: String(consultation.eventType || "").slice(0, 200), eventDate: consultation.eventDate, consultationStatus: consultation.status };
  }
  if (!idValid(targetUser) || id(reporter) === targetUser) return null;
  const user = await User.findById(targetUser).select("_id username role").lean();
  if (!user) return null;
  return { targetId, targetUser: user._id, targetLabel: String(user.username || "Account").slice(0, 200), adminOnly: ["admin", "moderator"].includes(user.role), evidence };
}
async function staffScope(user) {
  if (user.role === "admin") return {};
  const staff = await User.find({ role: { $in: ["admin", "moderator"] } }).select("_id").lean();
  const staffIds = [...new Set([...staff.map((user) => id(user)), id(user)])];
  return { adminOnly: false, targetUser: { $nin: staffIds }, reporter: { $nin: staffIds } };
}
function parseReportQuery(query, staff = false, viewerId) {
  const allowed = staff ? ["status", "category", "type", "priority", "assigned", "sort", "page", "pageSize"] : ["status", "page", "pageSize"];
  if (Object.keys(query).some((key) => !allowed.includes(key)) || Object.values(query).some((value) => typeof value !== "string")) return null;
  const status = query.status || "all";
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if ((status !== "all" && !statuses.includes(status)) || (query.page !== undefined && !/^\d+$/.test(query.page)) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || (query.pageSize !== undefined && !/^\d+$/.test(query.pageSize)) || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
  const filter = status === "all" ? {} : { status };
  const filters = { status };
  if (staff) {
    for (const [key, values] of [["category", categories], ["type", types], ["priority", ["normal", "urgent"]], ["assigned", ["mine", "unassigned"]], ["sort", ["newest", "oldest", "priority"]]]) {
      const value = query[key] || (key === "sort" ? "newest" : "all");
      if (value !== "all" && !values.includes(value) || key === "sort" && value === "all") return null;
      filters[key] = value;
      if (["category", "type", "priority"].includes(key) && value !== "all") filter[key] = value;
      if (key === "assigned" && value !== "all") filter.assignedTo = value === "mine" ? viewerId : null;
    }
  }
  const sort = filters.sort === "priority" ? { priority: -1, createdAt: 1, _id: 1 } : { createdAt: filters.sort === "oldest" ? 1 : -1, _id: filters.sort === "oldest" ? 1 : -1 };
  return { filter, filters, sort, page, pageSize };
}
function reportSummary(report, staff = false, detail = false) {
  return {
    _id: report._id, type: report.type, targetLabel: report.targetLabel, category: report.category,
    subject: report.subject, status: report.status, resolution: report.resolution || null,
    resolvedAt: report.resolvedAt || null, createdAt: report.createdAt, updatedAt: report.updatedAt,
    ...(detail ? { details: report.details, evidence: report.evidence || {} } : {}),
    ...(staff ? { reporter: report.reporter, targetUser: report.targetUser || null, priority: report.priority, assignedTo: report.assignedTo || null, adminOnly: report.adminOnly, ...(detail ? { version: report.version, history: (report.history || []).slice(-100).reverse().map((entry) => ({ _id: entry._id, action: entry.action, by: entry.by, at: entry.at, note: entry.note, status: entry.status, assignedTo: entry.assignedTo || null, priority: entry.priority, resolution: entry.resolution || null })) } : {}) } : {}),
  };
}
module.exports = { categories, types, statuses, idValid, id, fields, listFields, reportContext, staffScope, parseReportQuery, reportSummary };
