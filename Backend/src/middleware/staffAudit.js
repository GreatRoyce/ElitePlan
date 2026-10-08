const { randomUUID } = require("node:crypto");
const Audit = require("../models/staffAudit.model");
const { categories, targetKinds, idValid, object } = require("../services/staffAudit.catalog");
const { permissions } = require("../services/staffAccess.service");
const version = (v) => Number.isSafeInteger(v) && v >= 0 ? v : null;
const resultStates = new Set(["active", "suspended", "banned", "archived", "open", "under_review", "waiting_member", "resolved", "rejected", "dismissed", "verified", "unverified", "revoked", "pending", "approved", "declined", "completed", "Upcoming", "Ongoing", "Completed", "Cancelled", "upcoming", "ongoing", "cancelled", "draft", "published", "withdrawn"]);

module.exports = function staffAudit({ category, targetKind, targetParam, action: fixedAction, route }) {
  return async (req, res, next) => {
    // Mount only after real staff authentication, before route-specific permissions.
    if (!["admin", "moderator"].includes(req.user?.role)) return res.status(403).json({ success: false, message: "Staff authentication is required." });
    const b = object(req.body) ? req.body : {}, rawAction = fixedAction || b.action;
    const action = categories[category].includes(rawAction) ? rawAction : "invalid";
    const proposedKind = typeof targetKind === "function" ? targetKind(req.params) : targetKind;
    const allowedKinds = { moderation: ["account"], archive: ["account"], staff: ["account"], reports: ["report"], verification: ["vendor", "planner"], content: ["vendor", "planner"], operations: ["consultations", "events", "planner-events"], support: ["support"], announcements: ["announcement"], settings: ["platform"], adverts: ["advert"] }[category];
    const kind = allowedKinds.includes(proposedKind) ? proposedKind : "unknown";
    const note = typeof (b.note ?? b.reason) === "string" ? (b.note ?? b.reason).trim() : "";
    let entry;
    try {
      entry = await Audit.create({ requestId: randomUUID(), actorId: req.user._id, actorName: typeof req.user.username === "string" && req.user.username.trim() ? req.user.username.trim().slice(0, 160) : "Unnamed staff", actorRole: req.user.role, category, action, targetKind: targetKinds.includes(kind) ? kind : "unknown", targetId: idValid(req.params[targetParam]) ? req.params[targetParam].toLowerCase() : null, method: req.method, route, note: note && note.length <= 1000 ? note : null, expectedVersion: version(b.expectedVersion), attemptedAt: new Date() });
    } catch (error) {
      console.error("Staff audit reservation failed:", error.message);
      res.set("Cache-Control", "no-store");
      return res.status(503).json({ success: false, message: "The audit log is unavailable. This staff action was not started. Please try again later." });
    }
    res.set("Cache-Control", "no-store");
    let finishing = false;
    async function finish(status, body, abandoned = false) {
      if (finishing) return true;
      finishing = true;
      const succeeded = !abandoned && status >= 200 && status < 300 && body?.success !== false;
      const d = object(body?.data) ? body.data : {}, resultVersion = version(d.version ?? d.oversight?.version ?? d.verification?.version ?? d.moderation?.version);
      const candidate = d.status ?? d.record?.status ?? d.verification?.status ?? d.moderation?.status;
      const resultState = succeeded ? typeof d.moderation?.hidden === "boolean" ? d.moderation.hidden ? "hidden" : "visible" : resultStates.has(candidate) ? candidate : null : null;
      try {
        const changes = { completedAt: new Date(), outcome: abandoned ? "unconfirmed" : succeeded ? "succeeded" : status >= 400 && status < 500 ? "denied" : "failed", httpStatus: abandoned ? null : status, resultVersion: succeeded ? resultVersion : null, resultState };
        if (succeeded) {
          if (!targetParam && idValid(String(d._id))) changes.targetId = d._id;
          if (["client", "vendor", "planner", "admin", "moderator"].includes(d.role)) changes.resultRole = d.role;
          const granted = d.staff?.permissions;
          if (category === "staff" && Array.isArray(granted)) changes.resultPermissions = [...new Set(granted.filter((p) => permissions.includes(p)))];
          if (idValid(String(d.assignedTo))) changes.resultAssignedTo = d.assignedTo;
          if (["normal", "urgent"].includes(d.priority)) changes.resultPriority = d.priority;
          if (category === "settings") {
            const history = d.history?.at(-1);
            const snapshot = (value) => value && ["client", "vendor", "planner"].every((r) => typeof value.registration?.[r] === "boolean") && typeof value.consultationsEnabled === "boolean" ? { registration: { client: value.registration.client, vendor: value.registration.vendor, planner: value.registration.planner }, consultationsEnabled: value.consultationsEnabled } : null;
            const before = snapshot(history?.before), after = snapshot(history?.after);
            if (before && after) changes.settingsChange = { before, after };
          }
        }
        const changed = await Audit.updateOne({ _id: entry._id, outcome: "pending" }, { $set: changes }, { runValidators: true });
        if (changed.matchedCount !== 1) throw new Error("Audit completion was not matched");
        return true;
      } catch (error) { console.error("Staff audit completion failed:", error.message); return false; }
    }
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      const saved = await finish(res.statusCode, body);
      if (res.destroyed) return res;
      if (!saved) {
        res.set("X-Staff-Audit-Status", "pending");
        if (object(body)) body = { ...body, auditWarning: "Audit completion is unconfirmed. Check the audit log before repeating this action.", ...(typeof body.message === "string" ? { message: `${body.message} Audit completion is unconfirmed; check the audit log before repeating this action.` } : {}) };
      }
      return originalJson(body);
    };
    res.once("finish", () => { if (!finishing) void finish(res.statusCode); });
    res.once("close", () => { if (!finishing) void finish(null, null, true); });
    if (res.destroyed) { await finish(null, null, true); return; }
    next();
  };
};
