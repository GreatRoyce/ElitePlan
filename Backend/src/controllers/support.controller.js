const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Ticket = require("../models/supportTicket.model");
const service = require("../services/support.service");
const { accountStatus } = require("../services/accountAccess.service");
const { memberRoles } = require("../services/staffAccess.service");
const { idValid } = require("../services/reports.service");
const dummyHash = bcrypt.hashSync("support-password-check", 10);
const text = (v) => typeof v === "string" ? v.trim() : "";
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const fail = (res, error) => { console.error("Support operation failed:", error.message); return res.status(500).json({ success: false, message: "Unable to process this support request. Please try again." }); };
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };

async function session(req, res) {
  const body = req.body;
  if (!object(body) || Object.keys(body).some((k) => !["email", "password"].includes(k)) || !text(body.email) || text(body.email).length > 254 || typeof body.password !== "string" || !body.password || body.password.length > 256) return res.status(400).json({ success: false, message: "Provide your account email and password." });
  try {
    const user = await User.findOne({ email: text(body.email).toLowerCase() }).select("_id role password authVersion");
    const matches = await bcrypt.compare(body.password, user?.password || dummyHash);
    if (!user || !matches || !memberRoles.includes(user.role)) return res.status(401).json({ success: false, message: "Unable to sign in to support with these credentials." });
    const token = jwt.sign({ id: user._id, purpose: "support", authVersion: user.authVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: "30m" });
    return res.json({ success: true, token, message: "Signed in to support." });
  } catch (error) { return fail(res, error); }
}
async function me(req, res) {
  try { return res.json({ success: true, data: { user: { id: req.user._id, username: req.user.username, accountStatus: accountStatus(req.user) }, appealOptions: (await service.appealOptions(req.user)).map(service.publicAppeal) } }); }
  catch (error) { return fail(res, error); }
}
async function create(req, res) {
  const body = req.body;
  if (!object(body)) return res.status(400).json({ success: false, message: "Invalid support request." });
  const { type, category, requestId, appealKind } = body, subject = text(body.subject), details = text(body.details);
  if (Object.keys(body).some((k) => !["type", "category", "requestId", "subject", "details", "appealKind"].includes(k)) || !["support", "appeal"].includes(type) || !service.categories.includes(category) || !service.uuidValid(requestId) || subject.length < 3 || subject.length > 160 || details.length < 10 || details.length > 5000 || (type === "appeal" ? !["account", "listing", "verification"].includes(appealKind) : appealKind !== undefined)) return res.status(400).json({ success: false, message: "Provide a request type, category, subject (3-160 characters), and details (10-5000 characters). Appeals must identify an available restriction." });
  const key = { owner: req.user._id, requestId: requestId.toLowerCase() };
  function duplicate(existing) {
    if (existing.type !== type || existing.category !== category || existing.subject !== subject || existing.details !== details || (existing.appeal?.kind || undefined) !== appealKind) return res.status(409).json({ success: false, message: "This submission was already used for a different request. Start a new request." });
    return res.json({ success: true, message: "Request already received.", data: service.summary(existing, false, true) });
  }
  try {
    const existing = await Ticket.findOne(key).lean(); if (existing) return duplicate(existing);
    const appeal = type === "appeal" ? (await service.appealOptions(req.user)).find((a) => a.kind === appealKind) : null;
    if (type === "appeal" && !appeal) return res.status(409).json({ success: false, message: "This restriction is no longer available to appeal. Refresh its details." });
    const created = await Ticket.create({ ...key, type, category, subject, details, ...(appeal ? { appeal } : {}) });
    return res.status(201).json({ success: true, message: "Request received. You can follow the conversation here.", data: service.summary(created, false, true) });
  } catch (error) { if (error.code === 11000) { try { const existing = await Ticket.findOne(key).lean(); if (existing) return duplicate(existing); } catch (failure) { return fail(res, failure); } } return fail(res, error); }
}
async function list(req, res, staff) {
  const options = service.parseQuery(req.query, staff); if (!options) return res.status(400).json({ success: false, message: "Invalid support filters." });
  try {
    const filter = { ...options.filter, ...(staff ? req.query.assigned === "mine" ? { assignedTo: req.user._id } : req.query.assigned === "unassigned" ? { assignedTo: null } : {} : { owner: req.user._id }) };
    const total = await Ticket.countDocuments(filter), totalPages = Math.ceil(total / options.pageSize), page = Math.min(options.page, Math.max(1, totalPages));
    const tickets = await Ticket.find(filter).select(staff ? service.projection : "-messages -details").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * options.pageSize).limit(options.pageSize).lean();
    return res.json({ success: true, data: { tickets: tickets.map((t) => service.summary(t, staff)), pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function staffDetail(ticket, reviewer) {
  const owner = await User.findById(ticket.owner).select("_id username role accountStatus suspendedUntil archivedAt").lean();
  const eligible = service.id(ticket.owner) !== service.id(reviewer._id) && (!ticket.appeal?.decisionBy || service.id(ticket.appeal.decisionBy) !== service.id(reviewer._id));
  return { ...service.summary(ticket, true, true), ownerAccount: owner ? { id: owner._id, username: owner.username, role: owner.role, accountStatus: accountStatus(owner) } : null, canReview: eligible, currentAppeal: await service.currentAppeal(ticket) };
}
async function get(req, res, staff) {
  if (!idValid(req.params.ticketId)) return res.status(400).json({ success: false, message: "Invalid support ticket." });
  try {
    const ticket = await Ticket.findOne({ _id: req.params.ticketId, ...(staff ? {} : { owner: req.user._id }) }).select(staff ? service.projection : "").lean();
    if (!ticket) return res.status(404).json({ success: false, message: "Support request not found." });
    return res.json({ success: true, data: staff ? await staffDetail(ticket, req.user) : service.summary(ticket, false, true) });
  } catch (error) { return fail(res, error); }
}
async function reply(req, res) {
  const body = req.body;
  if (!idValid(req.params.ticketId) || !object(body) || Object.keys(body).some((k) => !["text", "requestId", "expectedVersion"].includes(k)) || !service.uuidValid(body.requestId) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0 || !text(body.text) || text(body.text).length > 2000) return res.status(400).json({ success: false, message: "Provide a message (1-2000 characters) and the current request version." });
  try {
    const ticket = await Ticket.findOne({ _id: req.params.ticketId, owner: req.user._id }).select("+assignedTo").lean();
    if (!ticket) return res.status(404).json({ success: false, message: "Support request not found." });
    const existing = ticket.messages?.find((m) => m.requestId === body.requestId.toLowerCase() && service.id(m.author) === service.id(req.user._id));
    if (existing) return text(body.text) === existing.text ? res.json({ success: true, data: service.summary(ticket, false, true), message: "Message already received." }) : res.status(409).json({ success: false, message: "This message submission was already used. Refresh before replying." });
    if (["resolved", "rejected"].includes(ticket.status) || ticket.version !== body.expectedVersion || (ticket.messages || []).length >= 100) return res.status(409).json({ success: false, message: "This request changed, is closed, or has reached 100 messages. Refresh or start a follow-up request." });
    const updated = await Ticket.findOneAndUpdate({ _id: ticket._id, owner: req.user._id, version: body.expectedVersion, status: ticket.status }, { $set: ticket.status === "waiting_member" ? { status: ticket.assignedTo ? "under_review" : "open" } : {}, $inc: { version: 1 }, $push: { messages: { _id: new mongoose.Types.ObjectId(), requestId: body.requestId.toLowerCase(), author: req.user._id, from: "member", text: text(body.text), at: new Date() } } }, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This request changed. Refresh before replying." });
    return res.json({ success: true, data: service.summary(updated, false, true), message: "Message received." });
  } catch (error) { return fail(res, error); }
}
async function act(req, res) {
  const body = req.body;
  if (!idValid(req.params.ticketId) || !object(body)) return res.status(400).json({ success: false, message: "Invalid support action." });
  const { action, expectedVersion } = body, note = text(body.note), message = text(body.message), resolution = text(body.resolution);
  const closing = ["resolve", "reject", "accept"].includes(action), messaging = ["reply", "request_info"].includes(action);
  if (Object.keys(body).some((k) => !["action", "expectedVersion", "note", "message", "resolution", "priority", "expectedTargetVersion"].includes(k)) || !["claim", "release", "reply", "note", "priority", "request_info", "resolve", "reject", "accept", "reopen"].includes(action) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || !note || note.length > 1000 || (messaging ? !message || message.length > 2000 : body.message !== undefined) || (closing ? !resolution || resolution.length > 2000 : body.resolution !== undefined) || (action === "priority" ? !["normal", "urgent"].includes(body.priority) : body.priority !== undefined) || (action === "accept" ? !Number.isSafeInteger(body.expectedTargetVersion) || body.expectedTargetVersion < 0 : body.expectedTargetVersion !== undefined)) return res.status(400).json({ success: false, message: "Provide a supported action, current version, and private review note. Replies require a member-visible message; decisions require a resolution." });
  try {
    const ticket = await Ticket.findById(req.params.ticketId).select(service.projection).lean();
    if (!ticket) return res.status(404).json({ success: false, message: "Support request not found." });
    const data = await staffDetail(ticket, req.user);
    if (!data.canReview) return res.status(403).json({ success: false, message: "Another admin must review a request involving you or your original decision." });
    if (ticket.version !== expectedVersion || (action === "reopen" ? !["resolved", "rejected"].includes(ticket.status) : ["resolved", "rejected"].includes(ticket.status)) || (action === "claim" && ticket.assignedTo) || (!["claim", "release", "reopen"].includes(action) && service.id(ticket.assignedTo) !== service.id(req.user._id)) || (action === "release" && !ticket.assignedTo)) return res.status(409).json({ success: false, message: "The request changed or must be claimed by you before this action. Refresh its details." });
    if (action === "accept" && (ticket.type !== "appeal" || !data.currentAppeal?.remedied || data.currentAppeal.version !== body.expectedTargetVersion) || action === "resolve" && ticket.type === "appeal") return res.status(409).json({ success: false, message: "Apply the remedy using the linked admin controls, then refresh before accepting an appeal." });
    if (messaging && (ticket.messages || []).length >= 100) return res.status(409).json({ success: false, message: "This request reached 100 messages. Ask the member to start a follow-up request." });
    const now = new Date(), changes = {};
    if (action === "claim") Object.assign(changes, { assignedTo: req.user._id, status: "under_review" });
    if (action === "release" || action === "reopen") Object.assign(changes, { assignedTo: null, status: "open", outcome: null, resolution: null, closedAt: null });
    if (action === "priority") changes.priority = body.priority;
    if (action === "reply") changes.status = "under_review";
    if (action === "request_info") changes.status = "waiting_member";
    if (closing) Object.assign(changes, { status: action === "reject" ? "rejected" : "resolved", outcome: action === "accept" ? "accepted" : action === "reject" ? "rejected" : "resolved", resolution, closedAt: now });
    const updated = await Ticket.findOneAndUpdate({ _id: ticket._id, version: expectedVersion, status: ticket.status, assignedTo: ticket.assignedTo || null }, { $set: changes, $inc: { version: 1 }, $push: { history: { $each: [{ _id: new mongoose.Types.ObjectId(), action, by: req.user._id, at: now, note }], $slice: -100 }, ...(messaging ? { messages: { _id: new mongoose.Types.ObjectId(), requestId: require("node:crypto").randomUUID(), author: req.user._id, from: "admin", text: message, at: now } } : {}) } }, { new: true, runValidators: true }).select(service.projection).lean();
    if (!updated) return res.status(409).json({ success: false, message: "The request changed. Refresh before trying again." });
    return res.json({ success: true, message: "Support request updated.", data: await staffDetail(updated, req.user) });
  } catch (error) { return fail(res, error); }
}
module.exports = { noStore, session, me, create, reply, act, listMine: (req, res) => list(req, res, false), listStaff: (req, res) => list(req, res, true), getMine: (req, res) => get(req, res, false), getStaff: (req, res) => get(req, res, true) };
