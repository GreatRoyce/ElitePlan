const mongoose = require("mongoose");
const User = require("../models/user.model");
const { accountRestriction, moderationSummary } = require("../services/accountAccess.service");

const memberRoles = ["client", "vendor", "planner"];
const fields = "_id role archivedAt archivedBy archiveReason moderationVersion accountStatus suspendedUntil moderationReason moderationHistory";

async function archiveAccount(req, res) {
  const { userId } = req.params;
  const body = req.body;
  if (!/^[a-f0-9]{24}$/i.test(userId) || !body || Array.isArray(body) || typeof body !== "object") return res.status(400).json({ success: false, message: "Invalid archive request." });
  const { action, expectedVersion } = body;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (Object.keys(body).some((key) => !["action", "reason", "expectedVersion"].includes(key)) || !["archive", "unarchive"].includes(action) || !reason || reason.length > 1000 || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return res.status(400).json({ success: false, message: "Provide a valid archive action, a reason (1–1000 characters), and the current account version." });
  if (String(req.user._id) === userId.toLowerCase()) return res.status(403).json({ success: false, message: "You cannot archive your own account." });
  try {
    const user = await User.findById(userId).select(fields).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (!memberRoles.includes(user.role)) return res.status(403).json({ success: false, message: "Staff accounts are protected from archiving." });
    if ((user.moderationVersion ?? 0) !== expectedVersion || Boolean(user.archivedAt) !== (action === "unarchive")) return res.status(409).json({ success: false, message: "This account has changed or the action does not apply. Refresh its details." });
    const now = new Date();
    const versionFilter = expectedVersion === 0 ? { $or: [{ moderationVersion: 0 }, { moderationVersion: { $exists: false } }] } : { moderationVersion: expectedVersion };
    const updated = await User.findOneAndUpdate({ _id: userId, role: { $in: memberRoles }, archivedAt: action === "archive" ? null : user.archivedAt, ...versionFilter }, {
      $set: action === "archive" ? { archivedAt: now, archivedBy: req.user._id, archiveReason: reason } : { archivedAt: null, archivedBy: null, archiveReason: null },
      $inc: { moderationVersion: 1, authVersion: 1 },
      $push: { moderationHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action, reason, by: req.user._id, at: now, until: null }], $slice: -100 } },
    }, { new: true, runValidators: true }).select(fields).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This account has changed. Refresh its details before trying again." });
    if (action === "archive") {
      try {
        const io = req.app.get("io");
        if (io) { const room = `user:${updated._id}`; io.to(room).emit("account_restricted", accountRestriction(updated)); io.in(room).disconnectSockets(true); }
      } catch (error) { console.error("Archive realtime delivery failed:", error.message); }
    }
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, message: action === "archive" ? "Account moved to the removed-user archive." : "Account restored from the archive. Existing bans or suspensions still apply; the user must sign in again.", data: moderationSummary(updated) });
  } catch (error) {
    console.error("Account archive failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update the account archive." });
  }
}

module.exports = { archiveAccount };
