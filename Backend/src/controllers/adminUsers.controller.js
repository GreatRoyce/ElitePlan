const User = require("../models/user.model");
const ClientProfile = require("../models/clientProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");
const Consultation = require("../models/initialConsultation.model");
const Message = require("../models/message.model");
const Event = require("../models/event.model");
const { parseUserQuery, accountFields, detailFields, accountSummary, profileSummary, messageFilter } = require("../services/adminUsers.service");
const { moderationSummary } = require("../services/accountAccess.service");
const { memberRoles, staffSummary } = require("../services/staffAccess.service");

const profiles = {
  client: { model: ClientProfile, foreignKey: "user", fields: "_id fullName email phone locationPreference" },
  vendor: { model: VendorProfile, foreignKey: "userId", fields: "_id businessName contactPerson email phonePrimary description category city state country verified active" },
  planner: { model: PlannerProfile, foreignKey: "userId", fields: "_id fullName companyName email phonePrimary shortBio specialization state country verified active" },
};

async function listAccountRecords(req, res, archived) {
  const options = parseUserQuery(req.query, archived);
  if (!options) return res.status(400).json({ success: false, message: "Invalid user filters. Use a supported role and sort, a search of up to 100 characters, and valid page numbers." });
  if (req.user.role === "moderator") {
    if (options.role !== "all" && !memberRoles.includes(options.role)) return res.status(403).json({ success: false, message: "Moderators may only review member accounts." });
    if (options.role === "all") options.filter.role = { $in: memberRoles };
  }
  try {
    const total = await User.countDocuments(options.filter);
    const totalPages = Math.ceil(total / options.pageSize);
    const page = Math.min(options.page, Math.max(1, totalPages));
    const query = User.find(options.filter).select(accountFields).sort(options.sortOrder)
      .skip((page - 1) * options.pageSize).limit(options.pageSize);
    if (options.sort === "name") query.collation({ locale: "en", strength: 2 });
    const users = await query.lean();
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: {
      users: users.map(accountSummary),
      filters: { search: options.search, role: options.role, status: options.status, sort: options.sort },
      pagination: { page, pageSize: options.pageSize, total, totalPages },
    } });
  } catch (error) {
    console.error("Admin user list failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load users." });
  }
}

async function getUserDetails(req, res) {
  const { userId } = req.params;
  if (!/^[a-f0-9]{24}$/i.test(userId)) return res.status(400).json({ success: false, message: "Invalid user ID." });
  try {
    const user = await User.findById(userId).select(detailFields).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (req.user.role === "moderator" && (!memberRoles.includes(user.role) || user.archivedAt)) return res.status(403).json({ success: false, message: "Moderators may only review current member accounts." });
    const profileRole = user.role === "moderator" ? user.staffMemberRole : user.role;
    const config = profiles[profileRole];
    const profile = config ? await config.model.findOne({ [config.foreignKey]: user._id })
      .select(config.fields).sort({ createdAt: -1, _id: -1 }).lean() : null;
    const eventField = { client: "client", vendor: "vendors", planner: "planner" }[profileRole];
    const eventFilter = profile && eventField ? { [eventField]: profile._id } : null;
    const [consultationsSent, consultationsReceived, messagesSent, messagesReceived, eventCount, recentConsultations, recentEvents] = await Promise.all([
      Consultation.countDocuments({ user: user._id }),
      Consultation.countDocuments({ targetUser: user._id }),
      Message.countDocuments(messageFilter("sender", { ...user, role: profileRole }, profile)),
      Message.countDocuments(messageFilter("recipient", { ...user, role: profileRole }, profile)),
      eventFilter ? Event.countDocuments(eventFilter) : 0,
      Consultation.find({ $or: [{ user: user._id }, { targetUser: user._id }] })
        .select("_id user eventType eventDate status createdAt").sort({ createdAt: -1, _id: -1 }).limit(5).lean(),
      eventFilter ? Event.find(eventFilter).select("_id title date status").sort({ createdAt: -1, _id: -1 }).limit(5).lean() : [],
    ]);
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: {
      user: accountSummary(user),
      moderation: moderationSummary(user),
      archive: { archivedAt: user.archivedAt || null, archivedBy: user.archivedBy || null, reason: user.archiveReason || null },
      ...(req.user.role === "admin" ? { staff: staffSummary(user) } : {}),
      profile: profileSummary(profile, profileRole),
      activity: { consultationsSent, consultationsReceived, messagesSent, messagesReceived, eventCount },
      recentConsultations: recentConsultations.map((item) => ({
        _id: item._id, eventType: item.eventType, eventDate: item.eventDate, status: item.status,
        createdAt: item.createdAt, direction: String(item.user) === String(user._id) ? "Sent" : "Received",
      })),
      recentEvents: recentEvents.map((item) => ({ _id: item._id, title: item.title, date: item.date, status: item.status })),
    } });
  } catch (error) {
    console.error("Admin user details failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load user details." });
  }
}

const listUsers = (req, res) => listAccountRecords(req, res, false);
const listArchivedUsers = (req, res) => listAccountRecords(req, res, true);
module.exports = { listUsers, listArchivedUsers, getUserDetails };
