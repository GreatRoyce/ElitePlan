const Announcement = require("../models/announcement.model");
const Receipt = require("../models/announcementReceipt.model");
const s = require("../services/announcements.service");
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const fail = (res, error) => { console.error("Announcement operation failed:", error.message); return res.status(500).json({ success: false, message: "Unable to process announcements. Please try again." }); };
const fields = ["title", "body", "audiences", "important", "startsAt", "endsAt"];
async function create(req, res) {
  const body = req.body, payload = s.content(body);
  if (!payload || Object.keys(body).some((k) => ![...fields, "requestId", "note"].includes(k)) || !s.uuidValid(body.requestId) || !s.text(body.note) || s.text(body.note).length > 1000) return res.status(400).json({ success: false, message: "Provide a title (3-160 characters), message (10-5000), valid audiences and dates, and a private review note." });
  const key = { createdBy: req.user._id, requestId: body.requestId.toLowerCase() }, fingerprint = s.hash(payload);
  const duplicate = (a) => a.submissionHash !== fingerprint ? res.status(409).json({ success: false, message: "This submission was already used for different content. Start a new draft." }) : res.json({ success: true, message: "Draft already saved.", data: s.dto(a, true, true) });
  try {
    const previous = await Announcement.findOne(key).select(`${s.projection} +submissionHash`).lean(); if (previous) return duplicate(previous);
    const a = await Announcement.create({ ...payload, ...key, submissionHash: fingerprint, history: [{ action: "create", by: req.user._id, note: s.text(body.note), at: new Date() }] });
    return res.status(201).json({ success: true, message: "Announcement saved as a draft.", data: s.dto(a, true, true) });
  } catch (error) { if (error.code === 11000) { try { const a = await Announcement.findOne(key).select(`${s.projection} +submissionHash`).lean(); if (a) return duplicate(a); } catch (failure) { return fail(res, failure); } } return fail(res, error); }
}
async function list(req, res, staff = false, member = false) {
  const options = s.parseQuery(req.query, staff); if (!options) return res.status(400).json({ success: false, message: "Invalid announcement filters." });
  try {
    const now = new Date(), filter = staff ? { ...s.stateFilter(options.state, now), ...(options.audience !== "all" ? { audiences: options.audience } : {}) } : s.liveFilter(now, member ? req.user.role : null);
    const total = await Announcement.countDocuments(filter), totalPages = Math.ceil(total / options.pageSize), page = Math.min(options.page, Math.max(1, totalPages));
    const announcements = await Announcement.find(filter).sort({ important: -1, startsAt: -1, _id: -1 }).skip((page - 1) * options.pageSize).limit(options.pageSize).lean();
    const receipts = member && announcements.length ? await Receipt.find({ user: req.user._id, $or: announcements.map((a) => ({ announcement: a._id, publicationVersion: a.publicationVersion })) }).select("announcement publicationVersion acknowledgedAt").lean() : [];
    return res.json({ success: true, data: { announcements: announcements.map((a) => ({ ...s.dto(a, staff, false, now), ...(member ? { acknowledgedAt: receipts.find((r) => String(r.announcement) === String(a._id) && r.publicationVersion === a.publicationVersion)?.acknowledgedAt || null } : {}) })), pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function get(req, res) {
  if (!s.idValid(req.params.announcementId)) return res.status(400).json({ success: false, message: "Invalid announcement." });
  try {
    const a = await Announcement.findById(req.params.announcementId).select(s.projection).lean();
    if (!a) return res.status(404).json({ success: false, message: "Announcement not found." });
    return res.json({ success: true, data: s.dto(a, true, true) });
  } catch (error) { return fail(res, error); }
}
async function update(req, res) {
  const b = req.body, payload = s.content(b);
  if (!s.idValid(req.params.announcementId) || !payload || Object.keys(b).some((k) => ![...fields, "expectedVersion", "note"].includes(k)) || !Number.isSafeInteger(b.expectedVersion) || b.expectedVersion < 0 || !s.text(b.note) || s.text(b.note).length > 1000) return res.status(400).json({ success: false, message: "Provide valid draft content, dates, current version, and a private review note." });
  try {
    const a = await Announcement.findOneAndUpdate({ _id: req.params.announcementId, version: b.expectedVersion, status: { $in: ["draft", "withdrawn"] } }, { $set: payload, $inc: { version: 1 }, $push: { history: { $each: [{ action: "update", by: req.user._id, note: s.text(b.note), at: new Date() }], $slice: -100 } } }, { new: true, runValidators: true }).select(s.projection).lean();
    if (!a) return res.status(409).json({ success: false, message: "This announcement changed or cannot be edited. Withdraw published content first, then refresh." });
    return res.json({ success: true, message: "Draft content saved.", data: s.dto(a, true, true) });
  } catch (error) { return fail(res, error); }
}
async function act(req, res) {
  const b = req.body;
  if (!s.idValid(req.params.announcementId) || !s.object(b) || Object.keys(b).some((k) => !["action", "expectedVersion", "note"].includes(k)) || !["publish", "withdraw", "archive"].includes(b.action) || !Number.isSafeInteger(b.expectedVersion) || b.expectedVersion < 0 || !s.text(b.note) || s.text(b.note).length > 1000) return res.status(400).json({ success: false, message: "Provide a supported action, current version, and private review note." });
  try {
    const a = await Announcement.findById(req.params.announcementId).lean(); if (!a) return res.status(404).json({ success: false, message: "Announcement not found." });
    const now = new Date(), editable = ["draft", "withdrawn"].includes(a.status);
    if (a.version !== b.expectedVersion || (b.action === "withdraw" ? a.status !== "published" : !editable) || b.action === "publish" && a.endsAt && new Date(a.endsAt) <= now) return res.status(409).json({ success: false, message: "This announcement changed or this action is unavailable. Refresh; publishing also requires a future expiry." });
    const changes = b.action === "publish" ? { status: "published", startsAt: a.startsAt || now, publishedAt: now } : { status: b.action === "withdraw" ? "withdrawn" : "archived" };
    const updated = await Announcement.findOneAndUpdate({ _id: a._id, status: a.status, version: b.expectedVersion }, { $set: changes, $inc: { version: 1, ...(b.action === "publish" ? { publicationVersion: 1 } : {}) }, $push: { history: { $each: [{ action: b.action, by: req.user._id, note: s.text(b.note), at: now }], $slice: -100 } } }, { new: true, runValidators: true }).select(s.projection).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This announcement changed. Refresh before trying again." });
    return res.json({ success: true, message: b.action === "publish" ? s.state(updated, now) === "scheduled" ? "Announcement scheduled." : "Announcement published." : b.action === "withdraw" ? "Announcement withdrawn." : "Announcement archived.", data: s.dto(updated, true, true, now) });
  } catch (error) { return fail(res, error); }
}
async function acknowledge(req, res) {
  const b = req.body;
  if (!s.idValid(req.params.announcementId) || !s.object(b) || Object.keys(b).some((k) => k !== "publicationVersion") || !Number.isSafeInteger(b.publicationVersion) || b.publicationVersion < 1) return res.status(400).json({ success: false, message: "Provide the current announcement publication version." });
  try {
    const a = await Announcement.findOne({ ...s.liveFilter(new Date(), req.user.role), _id: req.params.announcementId, publicationVersion: b.publicationVersion }).select("_id").lean();
    if (!a) return res.status(404).json({ success: false, message: "This announcement is no longer available to acknowledge. Refresh the feed." });
    const key = { user: req.user._id, announcement: a._id, publicationVersion: b.publicationVersion };
    try { await Receipt.updateOne(key, { $setOnInsert: { ...key, acknowledgedAt: new Date() } }, { upsert: true, runValidators: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
    return res.json({ success: true, message: "Announcement acknowledged." });
  } catch (error) { return fail(res, error); }
}
module.exports = { noStore, create, get, update, act, acknowledge, listStaff: (req, res) => list(req, res, true), listPublic: (req, res) => list(req, res), listMine: (req, res) => list(req, res, false, true) };
