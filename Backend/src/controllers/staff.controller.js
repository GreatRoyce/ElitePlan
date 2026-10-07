const mongoose = require("mongoose");
const User = require("../models/user.model");
const { accountStatus } = require("../services/accountAccess.service");
const { memberRoles, permissions: supportedPermissions, staffSummary } = require("../services/staffAccess.service");

const fields = "_id role accountStatus suspendedUntil archivedAt moderationVersion moderatorPermissions staffMemberRole staffHistory";
async function manageModerator(req, res) {
  const { userId } = req.params;
  const body = req.body;
  if (!/^[a-f0-9]{24}$/i.test(userId) || !body || Array.isArray(body) || typeof body !== "object") return res.status(400).json({ success: false, message: "Invalid staff request." });
  const { action, expectedVersion, permissions } = body;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const validPermissions = Array.isArray(permissions) && permissions.length <= supportedPermissions.length && permissions.every((permission) => supportedPermissions.includes(permission)) && new Set(permissions).size === permissions.length && permissions.includes("users.read") && ["reports", "content"].every((area) => !permissions.includes(`${area}.manage`) || permissions.includes(`${area}.read`));
  if (Object.keys(body).some((key) => !["action", "reason", "expectedVersion", "permissions"].includes(key)) || !["appoint", "update", "revoke"].includes(action) || !reason || reason.length > 1000 || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || (action === "revoke" ? permissions !== undefined : !validPermissions)) return res.status(400).json({ success: false, message: "Provide a valid staff action, a reason (1–1000 characters), the current account version, and supported permissions including Review users. Revocation does not accept permissions." });
  if (String(req.user._id) === userId.toLowerCase()) return res.status(403).json({ success: false, message: "You cannot change your own staff access." });
  try {
    const user = await User.findById(userId).select(fields).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.role === "admin" || ![...memberRoles, "moderator"].includes(user.role)) return res.status(403).json({ success: false, message: "Admin accounts are protected from moderator appointments." });
    if ((user.moderationVersion ?? 0) !== expectedVersion || (action === "appoint" ? !memberRoles.includes(user.role) || accountStatus(user) !== "active" : user.role !== "moderator")) return res.status(409).json({ success: false, message: "This account has changed or is not eligible for this staff action. Refresh its details." });
    const memberRole = action === "appoint" ? user.role : user.staffMemberRole;
    if (!memberRoles.includes(memberRole)) return res.status(409).json({ success: false, message: "This moderator has no valid original member role. Repair its staff record before changing access." });
    const now = new Date();
    const granted = action === "revoke" ? [] : supportedPermissions.filter((permission) => permissions.includes(permission));
    const versionFilter = expectedVersion === 0 ? { $or: [{ moderationVersion: 0 }, { moderationVersion: { $exists: false } }] } : { moderationVersion: expectedVersion };
    const updated = await User.findOneAndUpdate({ _id: userId, role: user.role, archivedAt: user.archivedAt || null, accountStatus: user.accountStatus || null, suspendedUntil: user.suspendedUntil || null, ...(action !== "appoint" ? { staffMemberRole: memberRole } : {}), ...versionFilter }, {
      $set: { role: action === "revoke" ? memberRole : "moderator", moderatorPermissions: granted, staffMemberRole: action === "revoke" ? null : memberRole },
      $inc: { moderationVersion: 1, authVersion: 1 },
      $push: { staffHistory: { $each: [{ _id: new mongoose.Types.ObjectId(), action, reason, by: req.user._id, at: now, permissions: granted, memberRole }], $slice: -100 } },
    }, { new: true, runValidators: true }).select(fields).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This account has changed. Refresh its details before trying again." });
    try {
      const io = req.app.get("io");
      if (io) { const room = `user:${updated._id}`; io.to(room).emit("account_restricted", { code: "SESSION_REVOKED", message: "Your staff access has changed. Please sign in again." }); io.in(room).disconnectSockets(true); }
    } catch (error) { console.error("Staff access realtime delivery failed:", error.message); }
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, message: { appoint: "Moderator appointed. They must sign in again.", update: "Moderator permissions updated. They must sign in again.", revoke: "Moderator access revoked. The original member role is restored; they must sign in again." }[action], data: { role: updated.role, version: updated.moderationVersion, staff: staffSummary(updated) } });
  } catch (error) {
    console.error("Staff access update failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update moderator access." });
  }
}
module.exports = { manageModerator };
