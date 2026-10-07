const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { accountStatus, accountRestriction, moderationSummary } = require("../services/accountAccess.service");

const memberRoles = ["client", "vendor", "planner"];
const moderationFields = "_id role accountStatus suspendedUntil moderationReason moderationVersion moderationHistory archivedAt";

async function moderateAccount(req, res) {
  const { userId } = req.params;
  const body = req.body;
  if (!/^[a-f0-9]{24}$/i.test(userId) || !body || Array.isArray(body) || typeof body !== "object") return res.status(400).json({ success: false, message: "Invalid moderation request." });
  const { action, expectedVersion, durationHours } = body;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (Object.keys(body).some((key) => !["action", "reason", "expectedVersion", "durationHours"].includes(key)) || !["warn", "suspend", "ban", "restore"].includes(action) || !reason || reason.length > 1000 || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || (action === "suspend" ? !Number.isInteger(durationHours) || durationHours < 1 || durationHours > 2160 : durationHours !== undefined)) return res.status(400).json({ success: false, message: "Provide a valid action, a reason (1–1000 characters), and the current account version. Suspension must last 1–2160 hours." });
  if (String(req.user._id) === userId.toLowerCase()) return res.status(403).json({ success: false, message: "You cannot moderate your own account." });
  try {
    const user = await User.findById(userId).select(moderationFields).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (!memberRoles.includes(user.role)) return res.status(403).json({ success: false, message: "Staff accounts are protected from member moderation." });
    const now = new Date();
    const status = accountStatus(user, now);
    if (status === "archived") return res.status(409).json({ success: false, message: "Restore this account from the archive before changing moderation." });
    if ((user.moderationVersion ?? 0) !== expectedVersion) return res.status(409).json({ success: false, message: "This account has changed. Refresh its details before trying again." });
    if ((action === "warn" && status !== "active") || (action === "suspend" && status === "banned") || (action === "restore" && status === "active") || (action === "ban" && status === "banned")) return res.status(409).json({ success: false, message: "This action does not apply to the current account status. Refresh its details." });
    const until = action === "suspend" ? new Date(now.getTime() + durationHours * 3600000) : null;
    const changes = { moderatedBy: req.user._id, moderatedAt: now };
    if (action === "warn") changes.lastWarning = { id: randomUUID(), reason, issuedAt: now, acknowledgedAt: null };
    else Object.assign(changes, { accountStatus: action === "restore" ? "active" : action === "ban" ? "banned" : "suspended", suspendedUntil: until, moderationReason: action === "restore" ? null : reason });
    const versionFilter = expectedVersion === 0 ? { $or: [{ moderationVersion: 0 }, { moderationVersion: { $exists: false } }] } : { moderationVersion: expectedVersion };
    const updated = await User.findOneAndUpdate({ _id: userId, archivedAt: null, role: { $in: memberRoles }, ...versionFilter }, {
      $set: changes,
      $inc: { moderationVersion: 1, ...(action !== "warn" ? { authVersion: 1 } : {}) },
      $push: { moderationHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action, reason, by: req.user._id, at: now, until }], $slice: -100 } },
    }, { new: true, runValidators: true }).select("_id accountStatus suspendedUntil moderationReason moderationVersion moderationHistory").lean();
    if (!updated) return res.status(409).json({ success: false, message: "This account has changed. Refresh its details before trying again." });
    try {
      const io = req.app.get("io");
      if (io) {
        const room = `user:${updated._id}`;
        if (action === "warn") io.to(room).emit("account_warning", { userId: String(updated._id), warning: changes.lastWarning });
        else if (action !== "restore") {
          io.to(room).emit("account_restricted", accountRestriction(updated));
          io.in(room).disconnectSockets(true);
        }
      }
    } catch (error) { console.error("Moderation realtime delivery failed:", error.message); }
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, message: { warn: "Warning issued.", suspend: "Account suspended.", ban: "Account banned.", restore: "Account access restored. The user must sign in again." }[action], data: moderationSummary(updated) });
  } catch (error) {
    console.error("Account moderation failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update account moderation." });
  }
}

async function acknowledgeWarning(req, res) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(req.params.warningId)) return res.status(400).json({ success: false, message: "Invalid warning ID." });
  try {
    const user = await User.findOneAndUpdate({ _id: req.user._id, "lastWarning.id": req.params.warningId }, { $set: { "lastWarning.acknowledgedAt": new Date() } }, { new: true }).select("_id").lean();
    if (!user) return res.status(404).json({ success: false, message: "This warning is no longer current. Refresh your account." });
    return res.sendStatus(204);
  } catch (error) {
    console.error("Warning acknowledgement failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to acknowledge the warning." });
  }
}

module.exports = { moderateAccount, acknowledgeWarning };
