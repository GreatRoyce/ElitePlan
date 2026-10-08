const mongoose = require("mongoose");
const Consultation = require("../models/initialConsultation.model");
const Event = require("../models/event.model");
const PlannerDashboard = require("../models/dashboards/plannerdashboard.model");

const models = { consultations: Consultation, events: Event, "planner-events": PlannerDashboard };
const states = { consultations: ["pending", "approved", "declined", "completed"], events: ["upcoming", "ongoing", "completed", "cancelled"] };
const idValid = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
const projection = "+oversightVersion +oversightFlag +oversightHistory";
const boardProjection = "+events.oversightVersion +events.oversightFlag +events.oversightHistory";
function versionFilter(record, prefix = "") {
  return record.oversightVersion ? { [`${prefix}oversightVersion`]: record.oversightVersion } : { $or: [{ [`${prefix}oversightVersion`]: 0 }, { [`${prefix}oversightVersion`]: { $exists: false } }] };
}
function memberRecord(record) {
  if (!record) return record;
  const plain = record.toObject ? record.toObject() : { ...record };
  for (const key of ["oversightVersion", "oversightFlag", "oversightHistory"]) delete plain[key];
  return plain;
}
function status(record) { return String(record.status || "").toLowerCase(); }
function actions(record, type) {
  const current = status(record);
  const common = ["note", record.oversightFlag ? "clear_flag" : "flag"];
  return [...common, ...(type === "consultations" ? current === "pending" ? ["decline"] : current === "approved" ? ["complete"] : current === "declined" ? ["reopen"] : [] : current === "upcoming" ? ["start", "cancel"] : current === "ongoing" ? ["complete", "cancel"] : current === "cancelled" ? ["reopen"] : [])];
}
function nextStatus(record, type, action) {
  const current = status(record);
  if (["note", "flag", "clear_flag"].includes(action)) return current;
  return { decline: "declined", complete: "completed", start: "ongoing", cancel: "cancelled", reopen: type === "consultations" ? "pending" : "upcoming" }[action];
}
function actionWrite(record, type, action, reason, by) {
  const now = new Date(), from = status(record), to = nextStatus(record, type, action), changed = from !== to;
  const set = { ...(action === "flag" || action === "clear_flag" ? { oversightFlag: action === "flag" } : {}) };
  if (changed) {
    set.status = type === "events" ? to[0].toUpperCase() + to.slice(1) : to;
    set.oversightNotice = { reason, at: now };
    if (type === "consultations") {
      if (to === "declined") set.rejectedAt = now;
      if (to === "completed") set.completedAt = now;
      if (to === "pending") Object.assign(set, { approvedAt: null, rejectedAt: null, completedAt: null });
    }
  }
  return { $set: set, $inc: { oversightVersion: 1 }, $push: { oversightHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action, by, reason, at: now, from, to }], $slice: -100 } } };
}
function dayStart(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? new Date(`${value}T00:00:00+01:00`) : null;
}
function parseQuery(query) {
  if (Object.keys(query).some((key) => !["type", "status", "flagged", "from", "to", "search", "page", "pageSize"].includes(key)) || Object.values(query).some((value) => typeof value !== "string")) return null;
  const type = query.type || "consultations", current = query.status || "all", flagged = query.flagged || "all", search = (query.search || "").trim();
  const page = query.page === undefined ? 1 : Number(query.page), pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  const from = query.from ? dayStart(query.from) : null, to = query.to ? dayStart(query.to) : null;
  if (!Object.hasOwn(models, type) || current !== "all" && !(type === "consultations" ? states.consultations : states.events).includes(current) || !["all", "yes", "no"].includes(flagged) || search.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || ["page", "pageSize"].some((key) => query[key] !== undefined && !/^\d+$/.test(query[key])) || query.from && !from || query.to && !to || from && to && from > to) return null;
  return { type, status: current, flagged, search, page, pageSize, from: query.from || "", to: query.to || "" };
}
function queuePipeline(options) {
  const type = options.type, board = type === "planner-events", consultation = type === "consultations";
  const pipeline = board ? [{ $unwind: "$events" }, { $project: { _id: "$events._id", boardId: "$_id", title: "$events.name", date: "$events.date", status: "$events.status", flagged: "$events.oversightFlag", createdAt: "$events.createdAt", updatedAt: "$events.updatedAt" } }] : [{ $project: { _id: 1, title: consultation ? "$eventType" : "$title", date: consultation ? "$eventDate" : "$date", status: { $toLower: "$status" }, flagged: "$oversightFlag", createdAt: 1, updatedAt: 1 } }];
  const match = {};
  if (options.status !== "all") match.status = options.status;
  if (options.flagged !== "all") match.flagged = options.flagged === "yes" ? true : { $ne: true };
  if (options.search) match.title = { $regex: options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (options.from || options.to) match.date = { ...(options.from ? { $gte: dayStart(options.from) } : {}), ...(options.to ? { $lt: new Date(dayStart(options.to).getTime() + 86400000) } : {}) };
  pipeline.push({ $match: match });
  return pipeline;
}
module.exports = { models, states, projection, boardProjection, idValid, versionFilter, memberRecord, status, actions, actionWrite, dayStart, parseQuery, queuePipeline };
