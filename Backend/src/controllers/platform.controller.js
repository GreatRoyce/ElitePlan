const Settings = require("../models/platformSettings.model");
const settings = require("../services/platformSettings.service");
const health = require("../services/platformHealth.service");
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
async function publicSettings(req, res) {
  try { return res.json({ success: true, data: await settings.availability() }); }
  catch { return res.status(503).json({ success: false, message: "Service availability cannot be checked. Please try again later." }); }
}
async function getSettings(req, res) {
  try { return res.json({ success: true, data: settings.adminDto(await settings.read(true)) }); }
  catch { return res.status(503).json({ success: false, message: "Platform settings are unavailable. Please try again later." }); }
}
async function updateSettings(req, res) {
  const input = settings.parse(req.body);
  if (!input) return res.status(400).json({ success: false, message: "Provide all four availability switches, the current revision and a reason of 1–1000 characters." });
  try {
    const current = await settings.read();
    if ((current?.version ?? 0) !== input.expectedVersion) return conflict(res);
    const before = settings.publicDto(current), after = settings.publicDto(input);
    if (JSON.stringify(before) === JSON.stringify(after)) return res.status(400).json({ success: false, message: "Change at least one setting before saving." });
    const result = await Settings.findOneAndUpdate({ _id: settings.ID, version: input.expectedVersion }, { $set: after, $inc: { version: 1 }, $push: { history: { $each: [{ by: req.user._id, at: new Date(), note: input.note, version: input.expectedVersion + 1, before, after }], $slice: -100 } } }, { new: true, upsert: !current, runValidators: true, setDefaultsOnInsert: true, maxTimeMS: 2000 }).select(`${settings.fields} +history`).lean();
    if (!result) return conflict(res);
    return res.json({ success: true, message: "Platform settings saved. New requests use these settings immediately.", data: settings.adminDto(result) });
  } catch (e) {
    if (e.code === 11000) return conflict(res);
    return res.status(503).json({ success: false, message: "Unable to confirm the settings change. Refresh the settings and audit log before retrying." });
  }
}
function conflict(res) { return res.status(409).json({ success: false, message: "Settings changed during your review. Refresh and review the current revision before saving." }); }
async function getHealth(req, res) {
  try { return res.json({ success: true, data: await health.health(req.app) }); }
  catch { return res.status(503).json({ success: false, message: "Unable to check platform health. Please try again later." }); }
}
async function readiness(req, res) {
  const db = await health.database();
  return res.status(db.status === "healthy" ? 200 : 503).json({ status: db.status === "healthy" ? "ready" : "unavailable" });
}
module.exports = { noStore, publicSettings, getSettings, updateSettings, getHealth, readiness };
