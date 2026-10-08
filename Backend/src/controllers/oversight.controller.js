const User = require("../models/user.model");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const ClientProfile = require("../models/clientProfile.model");
const Notification = require("../models/notification.model");
const service = require("../services/oversight.service");
const { accountStatus } = require("../services/accountAccess.service");
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const fail = (res, error) => { console.error("Operations oversight failed:", error.message); return res.status(500).json({ success: false, message: "Unable to process this operations review. Please try again." }); };

async function list(req, res) {
  const options = service.parseQuery(req.query);
  if (!options) return res.status(400).json({ success: false, message: "Invalid operations filters." });
  try {
    const model = service.models[options.type], pipeline = service.queuePipeline(options);
    const [count] = await model.aggregate([...pipeline, { $count: "total" }]);
    const total = count?.total || 0, totalPages = Math.ceil(total / options.pageSize), page = Math.min(options.page, Math.max(1, totalPages));
    const records = await model.aggregate([...pipeline, { $sort: { date: 1, _id: 1 } }, { $skip: (page - 1) * options.pageSize }, { $limit: options.pageSize }]);
    const today = service.dayStart(new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }));
    return res.json({ success: true, data: { records: records.map((r) => ({ _id: r._id, type: options.type, title: r.title, date: r.date || null, status: r.status, flagged: r.flagged === true, createdAt: r.createdAt || null, attention: options.type === "consultations" ? r.status === "pending" && Boolean(r.createdAt) && new Date(r.createdAt).getTime() < Date.now() - 7 * 86400000 : Boolean(r.date) && ["upcoming", "ongoing"].includes(r.status) && new Date(r.date) < today })), filters: options, pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function load(type, id) {
  if (type === "planner-events") {
    const board = await service.models[type].findOne({ "events._id": id }).select(service.boardProjection).lean();
    const record = board?.events?.find((e) => String(e._id) === id);
    return record ? { record, board } : null;
  }
  const record = await service.models[type].findById(id).select(service.projection).lean();
  return record ? { record } : null;
}
async function person(userId, label, profileId) {
  const user = userId ? await User.findById(userId).select("_id username role archivedAt accountStatus suspendedUntil").lean() : null;
  return { label, profileId: profileId || null, userId: user?._id || userId || null, name: user?.username || "Unavailable account", role: user?.role || null, accountStatus: user ? accountStatus(user) : "missing", archived: Boolean(user?.archivedAt), missing: !user };
}
async function participantProfile(Model, id, label, key) {
  const profile = id ? await Model.findById(id).select(`_id ${key}`).lean() : null;
  const result = await person(profile?.[key], label, id);
  return { ...result, missingProfile: !profile };
}
async function participants(type, loaded) {
  const r = loaded.record;
  if (type === "consultations") return Promise.all([person(r.user, "Requester"), person(r.targetUser, "Professional")]);
  return Promise.all([
    type === "planner-events" ? person(loaded.board.planner, "Planner") : participantProfile(PlannerProfile, r.planner, "Planner", "userId"),
    ...(r.client ? [participantProfile(ClientProfile, r.client, "Client", "user")] : []),
    ...(r.vendors || []).map((v) => participantProfile(VendorProfile, type === "planner-events" ? v.vendor : v, "Vendor", "userId")),
  ]);
}
async function detail(type, loaded, reviewer) {
  const r = loaded.record, people = await participants(type, loaded);
  const allowed = service.actions(r, type).filter((a) => !people.some((p) => String(p.userId) === String(reviewer._id)) || ["note", "flag", "clear_flag"].includes(a));
  return {
    record: { _id: r._id, type, title: r.title || r.name || r.eventType, date: r.date || r.eventDate, status: service.status(r), createdAt: r.createdAt || null, updatedAt: r.updatedAt || null,
      ...(type === "consultations" ? { eventTime: r.eventTime || null, location: r.eventLocation || {}, guests: r.guests || {}, services: r.services || [], vendorType: r.vendorType || [], approvedAt: r.approvedAt || null, rejectedAt: r.rejectedAt || null, completedAt: r.completedAt || null } : { location: r.location || null }),
    },
    participants: people,
    oversight: { version: r.oversightVersion ?? 0, flagged: r.oversightFlag === true, notice: r.oversightNotice?.reason ? { reason: r.oversightNotice.reason, at: r.oversightNotice.at || null } : null, history: (r.oversightHistory || []).slice(-100).reverse().map((e) => ({ _id: e._id, action: e.action, by: e.by, at: e.at, reason: e.reason, from: e.from, to: e.to })) },
    allowedActions: allowed,
  };
}
const validParams = ({ type, recordId }) => Object.hasOwn(service.models, type) && service.idValid(recordId);
async function get(req, res) {
  if (!validParams(req.params)) return res.status(400).json({ success: false, message: "Invalid operations record." });
  try {
    const loaded = await load(req.params.type, req.params.recordId);
    if (!loaded) return res.status(404).json({ success: false, message: "Operations record not found." });
    return res.json({ success: true, data: await detail(req.params.type, loaded, req.user) });
  } catch (error) { return fail(res, error); }
}
async function act(req, res) {
  const { type, recordId } = req.params, body = req.body;
  if (!validParams(req.params) || !body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ success: false, message: "Invalid operations action." });
  const { action, expectedVersion } = body, reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (Object.keys(body).some((key) => !["action", "reason", "expectedVersion"].includes(key)) || !["note", "flag", "clear_flag", "decline", "complete", "start", "cancel", "reopen"].includes(action) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || !reason || reason.length > 1000) return res.status(400).json({ success: false, message: "Provide a supported action, the current version, and a reason (1-1000 characters)." });
  try {
    const loaded = await load(type, recordId);
    if (!loaded) return res.status(404).json({ success: false, message: "Operations record not found." });
    const current = await detail(type, loaded, req.user), r = loaded.record;
    if (current.oversight.version !== expectedVersion || !current.allowedActions.includes(action)) return res.status(409).json({ success: false, message: "This action does not apply to the current record. Refresh and review it again." });
    const write = service.actionWrite(r, type, action, reason, req.user._id);
    let updated;
    if (type === "planner-events") {
      const update = Object.fromEntries(Object.entries(write).map(([operator, fields]) => [operator, Object.fromEntries(Object.entries(fields).map(([key, value]) => [`events.$.${key}`, value]))]));
      update.$set["events.$.updatedAt"] = new Date();
      update.$inc.__v = 1;
      const board = await service.models[type].findOneAndUpdate({ _id: loaded.board._id, planner: loaded.board.planner, events: { $elemMatch: { _id: r._id, status: r.status, ...service.versionFilter(r) } } }, update, { new: true, runValidators: true }).select(service.boardProjection).lean();
      const record = board?.events.find((e) => String(e._id) === recordId);
      if (record) updated = { record, board };
    } else {
      const record = await service.models[type].findOneAndUpdate({ _id: r._id, status: r.status, ...service.versionFilter(r) }, write, { new: true, runValidators: true }).select(service.projection).lean();
      if (record) updated = { record };
    }
    if (!updated) return res.status(409).json({ success: false, message: "The record changed while you were reviewing it. Refresh before retrying." });
    // Status persists even if notification delivery fails; private notes/flags never notify members.
    let notificationWarning = false;
    if (service.status(updated.record) !== service.status(r)) {
      const people = current.participants.filter((p) => p.userId && !p.missing);
      const results = await Promise.allSettled([...new Set(people.map((p) => String(p.userId)))].map((id) => Notification.create({ user: id, userModel: "User", sender: req.user._id, senderModel: "User", type: "operations", message: `An admin changed ${current.record.title} to ${service.status(updated.record)}. Reason: ${reason}` })));
      notificationWarning = results.some((result) => result.status === "rejected");
    }
    return res.json({ success: true, message: notificationWarning ? "Change saved. Some participant notifications could not be delivered." : "Operations review saved.", data: await detail(type, updated, req.user), notificationWarning });
  } catch (error) { return fail(res, error); }
}
module.exports = { list, get, act, noStore };
