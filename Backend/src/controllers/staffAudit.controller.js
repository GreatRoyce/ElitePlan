const Audit = require("../models/staffAudit.model");
const service = require("../services/staffAudit.service");
const { idValid } = require("../services/staffAudit.catalog");
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const fail = (res, error) => { console.error("Staff audit read failed:", error.message); return res.status(500).json({ success: false, message: "Unable to load staff audit history. Please try again." }); };
async function list(req, res) {
  const options = service.parseQuery(req.query); if (!options) return res.status(400).json({ success: false, message: "Invalid audit filters. Use valid IDs and Lagos dates." });
  try {
    const total = await Audit.countDocuments(options.filter), totalPages = Math.ceil(total / options.pageSize), page = Math.min(options.page, Math.max(1, totalPages));
    const entries = await Audit.find(options.filter).select(service.fields).sort({ attemptedAt: -1, _id: -1 }).skip((page - 1) * options.pageSize).limit(options.pageSize).lean();
    return res.json({ success: true, data: { entries: entries.map((e) => service.dto(e)), pagination: { page, pageSize: options.pageSize, total, totalPages } } });
  } catch (error) { return fail(res, error); }
}
async function get(req, res) {
  if (!idValid(req.params.auditId)) return res.status(400).json({ success: false, message: "Invalid audit entry." });
  try {
    const entry = await Audit.findById(req.params.auditId).select(service.fields).lean(); if (!entry) return res.status(404).json({ success: false, message: "Audit entry not found." });
    return res.json({ success: true, data: service.dto(entry) });
  } catch (error) { return fail(res, error); }
}
module.exports = { noStore, list, get };
