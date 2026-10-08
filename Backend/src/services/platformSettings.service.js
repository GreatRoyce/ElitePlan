const Settings = require("../models/platformSettings.model");
const ID = "000000000000000000000014";
const defaults = () => ({ registration: { client: true, vendor: true, planner: true }, consultationsEnabled: true });
const fields = "_id registration consultationsEnabled version updatedAt";
function publicDto(value) {
  if (!value) return defaults();
  return { registration: Object.fromEntries(["client", "vendor", "planner"].map((role) => [role, value.registration?.[role] === true])), consultationsEnabled: value.consultationsEnabled === true };
}
function adminDto(value) {
  return { _id: ID, ...publicDto(value), version: value?.version ?? 0, updatedAt: value?.updatedAt ?? null, history: (value?.history || []).map((h) => ({ by: h.by, at: h.at, note: h.note, version: h.version, before: publicDto(h.before), after: publicDto(h.after) })) };
}
async function read(history = false) {
  let timer;
  try {
    return await Promise.race([Settings.findById(ID).select(`${fields}${history ? " +history" : ""}`).maxTimeMS(2000).lean(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Settings read timed out")), 2000); })]);
  } finally { clearTimeout(timer); }
}
async function availability() { return publicDto(await read()); }
function parse(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["registration", "consultationsEnabled", "expectedVersion", "note"].includes(key))) return null;
  const r = body.registration;
  if (!r || typeof r !== "object" || Array.isArray(r) || Object.keys(r).length !== 3 || !["client", "vendor", "planner"].every((role) => typeof r[role] === "boolean") || typeof body.consultationsEnabled !== "boolean") return null;
  if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0 || body.expectedVersion >= Number.MAX_SAFE_INTEGER || typeof body.note !== "string" || !body.note.trim() || body.note.trim().length > 1000) return null;
  return { registration: { client: r.client, vendor: r.vendor, planner: r.planner }, consultationsEnabled: body.consultationsEnabled, expectedVersion: body.expectedVersion, note: body.note.trim() };
}
// No cached switches: each new request reads the current persisted settings.
async function allow(req, res, operation, role) {
  try {
    const current = await availability();
    if (operation === "registration" ? current.registration[role] : current.consultationsEnabled) return true;
    res.set("Cache-Control", "no-store");
    res.status(503).json({ success: false, code: "PLATFORM_PAUSED", message: operation === "registration" ? `New ${role} registrations are temporarily paused. Please try again later.` : "New consultation requests are temporarily paused. Please try again later." });
  } catch {
    res.set("Cache-Control", "no-store");
    res.status(503).json({ success: false, code: "PLATFORM_UNAVAILABLE", message: "Unable to check service availability. Please try again later." });
  }
  return false;
}
module.exports = { ID, fields, defaults, publicDto, adminDto, read, availability, parse, allow };
