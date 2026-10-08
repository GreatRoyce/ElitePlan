const Advert = require("../models/advert.model");
const s = require("../services/adverts.service");
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const fail = (res) => res.status(503).json({ success: false, message: "Unable to process adverts. Please refresh before retrying." });
const versionValid = (v) => Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER;
const noteValid = (v) => s.text(v).length > 0 && s.text(v).length <= 1000;
async function create(req, res) {
  const b = req.body, payload = s.content(b);
  if (!payload || Object.keys(b).some((k) => ![...s.fields, "requestId", "note"].includes(k)) || !s.uuidValid(b.requestId) || !noteValid(b.note)) return res.status(400).json({ success: false, message: "Provide valid advert content, placements, audiences, dates and a private review note." });
  const key = { createdBy: req.user._id, requestId: b.requestId.toLowerCase() }, fingerprint = s.hash(payload);
  const duplicate = (a) => a.submissionHash !== fingerprint ? res.status(409).json({ success: false, message: "This submission was already used for different content. Start a new draft." }) : res.json({ success: true, message: "Advert draft already saved.", data: s.dto(a, true, true) });
  try {
    const previous = await Advert.findOne(key).select(`${s.projection} +submissionHash`).lean(); if (previous) return duplicate(previous);
    const advert = await Advert.create({ ...payload, ...key, submissionHash: fingerprint, history: [{ action: "create", by: req.user._id, note: s.text(b.note), at: new Date() }] });
    return res.status(201).json({ success: true, message: "Advert saved as a draft.", data: s.dto(advert, true, true) });
  } catch (e) {
    if (e.code === 11000) { try { const a = await Advert.findOne(key).select(`${s.projection} +submissionHash`).lean(); if (a) return duplicate(a); } catch { return fail(res); } }
    return fail(res);
  }
}
async function listStaff(req, res) {
  const o = s.parseQuery(req.query, true); if (!o) return res.status(400).json({ success: false, message: "Invalid advert filters." });
  try {
    const now = new Date(), filter = { ...s.stateFilter(o.state, now), ...(o.audience !== "all" ? { audiences: o.audience } : {}), ...(o.placement !== "all" ? { placements: o.placement } : {}) };
    const total = await Advert.countDocuments(filter), totalPages = Math.ceil(total / o.pageSize), page = Math.min(o.page, Math.max(1, totalPages));
    const rows = await Advert.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * o.pageSize).limit(o.pageSize).lean();
    return res.json({ success: true, data: { adverts: rows.map((a) => s.dto(a, true, false, now)), pagination: { page, pageSize: o.pageSize, total, totalPages } } });
  } catch { return fail(res); }
}
async function feed(req, res, member = false) {
  const o = s.parseQuery(req.query); if (!o || !member && o.placement !== "home") return res.status(400).json({ success: false, message: "Choose a supported advert placement." });
  try {
    const now = new Date(), filter = s.liveFilter(now, member ? req.user.role : null, o.placement);
    const rows = await Advert.find(filter).sort({ publishedAt: -1, _id: -1 }).limit(50).lean();
    return res.json({ success: true, data: { adverts: rows.map((a) => s.dto(a)), rotationSeconds: 15 } });
  } catch { return fail(res); }
}
async function get(req, res) {
  if (!s.idValid(req.params.advertId)) return res.status(400).json({ success: false, message: "Invalid advert." });
  try { const a = await Advert.findById(req.params.advertId).select(s.projection).lean(); if (!a) return res.status(404).json({ success: false, message: "Advert not found." }); return res.json({ success: true, data: s.dto(a, true, true) }); }
  catch { return fail(res); }
}
async function update(req, res) {
  const b = req.body, payload = s.content(b);
  if (!s.idValid(req.params.advertId) || !payload || Object.keys(b).some((k) => ![...s.fields, "expectedVersion", "note"].includes(k)) || !versionValid(b.expectedVersion) || !noteValid(b.note)) return res.status(400).json({ success: false, message: "Provide valid draft content, the current revision and a private review note." });
  try {
    const a = await Advert.findOneAndUpdate({ _id: req.params.advertId, version: b.expectedVersion, status: { $in: ["draft", "withdrawn"] } }, { $set: payload, $inc: { version: 1 }, $push: { history: { $each: [{ action: "update", by: req.user._id, note: s.text(b.note), at: new Date() }], $slice: -100 } } }, { new: true, runValidators: true }).select(s.projection).lean();
    if (!a) return res.status(409).json({ success: false, message: "This advert changed or cannot be edited. Withdraw published content first, then refresh." });
    return res.json({ success: true, message: "Advert draft updated.", data: s.dto(a, true, true) });
  } catch { return fail(res); }
}
async function act(req, res) {
  const b = req.body;
  if (!s.idValid(req.params.advertId) || !s.object(b) || Object.keys(b).some((k) => !["action", "expectedVersion", "note"].includes(k)) || !["publish", "withdraw", "archive"].includes(b.action) || !versionValid(b.expectedVersion) || !noteValid(b.note)) return res.status(400).json({ success: false, message: "Provide a supported action, current revision and a private review note." });
  try {
    const a = await Advert.findById(req.params.advertId).lean(); if (!a) return res.status(404).json({ success: false, message: "Advert not found." });
    const now = new Date(), editable = ["draft", "withdrawn"].includes(a.status);
    if (a.version !== b.expectedVersion || (b.action === "withdraw" ? a.status !== "published" : !editable) || b.action === "publish" && (a.endsAt && new Date(a.endsAt) <= now || !s.content({ ...a, startsAt: a.startsAt ? new Date(a.startsAt).toISOString() : null, endsAt: a.endsAt ? new Date(a.endsAt).toISOString() : null }))) return res.status(409).json({ success: false, message: "This advert changed or this action is unavailable. Refresh and review the saved content and expiry." });
    const changes = b.action === "publish" ? { status: "published", startsAt: a.startsAt || now, publishedAt: now } : { status: b.action === "withdraw" ? "withdrawn" : "archived" };
    const updated = await Advert.findOneAndUpdate({ _id: a._id, status: a.status, version: b.expectedVersion }, { $set: changes, $inc: { version: 1, ...(b.action === "publish" ? { publicationVersion: 1 } : {}) }, $push: { history: { $each: [{ action: b.action, by: req.user._id, note: s.text(b.note), at: now }], $slice: -100 } } }, { new: true, runValidators: true }).select(s.projection).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This advert changed during review. Refresh before retrying." });
    return res.json({ success: true, message: b.action === "publish" ? s.state(updated, now) === "scheduled" ? "Advert scheduled." : "Advert published." : b.action === "withdraw" ? "Advert withdrawn." : "Advert archived.", data: s.dto(updated, true, true, now) });
  } catch { return fail(res); }
}
module.exports = { noStore, create, listStaff, get, update, act, listPublic: (req, res) => feed(req, res), listMine: (req, res) => feed(req, res, true) };
