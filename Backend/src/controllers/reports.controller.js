const mongoose = require("mongoose");
const Report = require("../models/report.model");
const User = require("../models/user.model");
const { accountStatus } = require("../services/accountAccess.service");
const { hasPermission } = require("../services/staffAccess.service");
const { categories, types, idValid, id, fields, listFields, reportContext, staffScope, parseReportQuery, reportSummary } = require("../services/reports.service");
const objectBody = (body) => body && typeof body === "object" && !Array.isArray(body);
const text = (value) => typeof value === "string" ? value.trim() : "";
const fail = (res, error) => { console.error("Report operation failed:", error.message); return res.status(500).json({ success: false, message: "Unable to process this report. Please try again." }); };
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };

async function getContext(req, res) {
  if (Object.keys(req.query).some((key) => !["type", "targetId"].includes(key)) || !types.includes(req.query.type) || req.query.type === "general" || !idValid(req.query.targetId)) return res.status(400).json({ success: false, message: "Invalid report target." });
  try {
    const context = await reportContext(req.query.type, req.query.targetId.toLowerCase(), req.user._id);
    if (!context) return res.status(404).json({ success: false, message: "This item is not available to report." });
    return res.json({ success: true, data: { type: req.query.type, targetLabel: context.targetLabel, evidence: context.evidence } });
  } catch (error) { return fail(res, error); }
}
async function createReport(req, res) {
  const body = req.body;
  if (!objectBody(body)) return res.status(400).json({ success: false, message: "Invalid report." });
  const { type, category, requestId } = body;
  const subject = text(body.subject); const details = text(body.details);
  const targetId = type === "general" ? null : typeof body.targetId === "string" ? body.targetId.toLowerCase() : body.targetId;
  if (Object.keys(body).some((key) => !["type", "category", "requestId", "subject", "details", "targetId"].includes(key)) || !types.includes(type) || !categories.includes(category) || typeof requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId) || subject.length < 3 || subject.length > 160 || details.length < 10 || details.length > 5000 || (type === "general" ? body.targetId != null : !idValid(targetId))) return res.status(400).json({ success: false, message: "Choose a report category and provide a subject (3–160 characters) and details (10–5000 characters)." });
  const key = { reporter: req.user._id, requestId: requestId.toLowerCase() };
  function duplicate(existing) {
    if (existing.type !== type || existing.category !== category || existing.subject !== subject || existing.details !== details || (existing.targetId ? id(existing.targetId) : null) !== targetId) return res.status(409).json({ success: false, message: "This submission has already been used for a different report. Start a new report." });
    return res.json({ success: true, message: "Report already received.", data: reportSummary(existing, false, true) });
  }
  try {
    const existing = await Report.findOne(key).lean();
    if (existing) return duplicate(existing);
    const context = await reportContext(type, targetId, req.user._id);
    if (!context) return res.status(404).json({ success: false, message: "This item is not available to report." });
    const created = await Report.create({ ...key, ...context, type, category, subject, details, adminOnly: context.adminOnly || category === "staff_conduct" });
    return res.status(201).json({ success: true, message: "Report received. You can follow its progress in My reports.", data: reportSummary(created, false, true) });
  } catch (error) {
    if (error.code === 11000) { try { const existing = await Report.findOne(key).lean(); if (existing) return duplicate(existing); } catch (failure) { return fail(res, failure); } }
    return fail(res, error);
  }
}
async function listReports(req, res, staff) {
  const options = parseReportQuery(req.query, staff, req.user._id);
  if (!options) return res.status(400).json({ success: false, message: "Invalid report filters." });
  try {
    const scope = staff ? await staffScope(req.user) : { reporter: req.user._id };
    const filter = { ...scope, ...options.filter };
    const total = await Report.countDocuments(filter);
    const totalPages = Math.ceil(total / options.pageSize); const page = Math.min(options.page, Math.max(totalPages, 1));
    const reports = await Report.find(filter).select(listFields).sort(options.sort).skip((page - 1) * options.pageSize).limit(options.pageSize).lean();
    return res.json({ success: true, data: { reports: reports.map((report) => reportSummary(report, staff)), filters: options.filters, pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function getReport(req, res, staff) {
  if (!idValid(req.params.reportId)) return res.status(400).json({ success: false, message: "Invalid report ID." });
  try {
    const scope = staff ? await staffScope(req.user) : { reporter: req.user._id };
    const report = await Report.findOne({ _id: req.params.reportId, ...scope }).select(fields).lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });
    return res.json({ success: true, data: reportSummary(report, staff, true) });
  } catch (error) { return fail(res, error); }
}
async function reviewers(req, res) {
  try {
    const users = await User.find({ archivedAt: null, $or: [{ role: "admin" }, { role: "moderator", moderatorPermissions: { $all: ["reports.read", "reports.manage"] } }] }).select("_id username role accountStatus suspendedUntil moderatorPermissions").sort({ username: 1, _id: 1 }).lean();
    return res.json({ success: true, data: users.filter((user) => accountStatus(user) === "active").map((user) => ({ _id: user._id, username: user.username, role: user.role })) });
  } catch (error) { return fail(res, error); }
}
async function updateReport(req, res) {
  const body = req.body;
  if (!idValid(req.params.reportId) || !objectBody(body)) return res.status(400).json({ success: false, message: "Invalid report action." });
  const { action, expectedVersion, assignedTo, priority } = body;
  const note = text(body.note); const resolution = text(body.resolution);
  const closing = ["resolve", "dismiss"].includes(action);
  if (Object.keys(body).some((key) => !["action", "expectedVersion", "note", "resolution", "assignedTo", "priority"].includes(key)) || !["claim", "assign", "release", "note", "priority", "resolve", "dismiss", "reopen"].includes(action) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || !note || note.length > 1000 || (closing ? !resolution || resolution.length > 2000 : body.resolution !== undefined) || (action === "assign" ? !idValid(assignedTo) : assignedTo !== undefined) || (action === "priority" ? !["normal", "urgent"].includes(priority) : priority !== undefined)) return res.status(400).json({ success: false, message: "Provide a supported action, current case version, and private review note (1–1000 characters). Closing a case requires a reporter-visible resolution (1–2000 characters)." });
  if (action === "assign" && req.user.role !== "admin") return res.status(403).json({ success: false, message: "Only admins can assign a case to another reviewer." });
  try {
    const scope = await staffScope(req.user);
    const report = await Report.findOne({ _id: req.params.reportId, ...scope }).select(fields).lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });
    if (report.version !== expectedVersion) return res.status(409).json({ success: false, message: "This case has changed. Refresh before trying again." });
    if (id(report.reporter) === id(req.user._id) || (report.targetUser && id(report.targetUser) === id(req.user._id))) return res.status(403).json({ success: false, message: "Another reviewer must handle a case involving your account." });
    const closed = ["resolved", "dismissed"].includes(report.status);
    if ((action === "reopen" ? !closed : closed) || (action === "claim" && report.assignedTo) || (!["claim", "assign", "reopen"].includes(action) && !report.assignedTo) || (req.user.role !== "admin" && report.assignedTo && id(report.assignedTo) !== id(req.user._id))) return res.status(409).json({ success: false, message: "This action does not apply or the case belongs to another reviewer. Refresh its details." });
    const changes = {};
    if (action === "claim" || action === "assign") {
      let reviewer = req.user._id;
      if (action === "assign") {
        const user = await User.findById(assignedTo).select("_id role accountStatus suspendedUntil archivedAt moderatorPermissions").lean();
        if (!user || accountStatus(user) !== "active" || !hasPermission(user, "reports.read") || !hasPermission(user, "reports.manage") || (report.adminOnly && user.role !== "admin") || id(user._id) === id(report.reporter) || (report.targetUser && id(user._id) === id(report.targetUser))) return res.status(400).json({ success: false, message: "Choose an active, eligible reviewer who is not involved in the report." });
        if (user.role === "moderator" && !await Report.findOne({ _id: report._id, ...await staffScope(user) }).select("_id").lean()) return res.status(400).json({ success: false, message: "This case requires an admin reviewer." });
        reviewer = user._id;
      }
      Object.assign(changes, { assignedTo: reviewer, status: "under_review" });
    }
    if (action === "release" || action === "reopen") Object.assign(changes, { assignedTo: null, status: "open", resolution: null, resolvedAt: null });
    if (action === "priority") changes.priority = priority;
    const now = new Date();
    if (closing) Object.assign(changes, { status: action === "resolve" ? "resolved" : "dismissed", resolution, resolvedAt: now });
    const updated = await Report.findOneAndUpdate({ _id: report._id, ...scope, version: expectedVersion, status: report.status, assignedTo: report.assignedTo || null }, {
      $set: changes, $inc: { version: 1 },
      $push: { history: { $each: [{ _id: new mongoose.Types.ObjectId(), action, by: req.user._id, at: now, note, status: changes.status || report.status, assignedTo: Object.hasOwn(changes, "assignedTo") ? changes.assignedTo : report.assignedTo || null, priority: changes.priority || report.priority, resolution: closing ? resolution : null }], $slice: -100 } },
    }, { new: true, runValidators: true }).select(fields).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This case has changed. Refresh before trying again." });
    return res.json({ success: true, message: "Case updated.", data: reportSummary(updated, true, true) });
  } catch (error) { return fail(res, error); }
}
module.exports = { noStore, getContext, createReport, listMine: (req, res) => listReports(req, res, false), listStaff: (req, res) => listReports(req, res, true), getMine: (req, res) => getReport(req, res, false), getStaff: (req, res) => getReport(req, res, true), reviewers, updateReport };
