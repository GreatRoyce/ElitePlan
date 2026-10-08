const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { memberRoles } = require("../services/staffAccess.service");
const { sessionRejection } = require("../services/accountAccess.service");

module.exports = async function supportAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Sign in to support to continue." });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (decoded.purpose !== undefined && decoded.purpose !== "support") return res.status(401).json({ success: false, message: "Invalid support session." });
    const user = await User.findById(decoded.id).select("_id username role authVersion accountStatus suspendedUntil archivedAt archiveReason moderationReason moderationVersion moderatedBy archivedBy");
    if (!user || (user.authVersion ?? 0) !== (decoded.authVersion ?? 0)) return res.status(401).json({ success: false, message: "Your support session has ended. Sign in to support again." });
    if (!memberRoles.includes(user.role)) return res.status(403).json({ success: false, message: "This support portal is for member accounts." });
    if (decoded.purpose !== "support" && sessionRejection(user, decoded)) return res.status(401).json({ success: false, message: "Sign in to support to review a restricted account." });
    req.user = user; next();
  } catch { return res.status(401).json({ success: false, message: "Your support session has ended. Sign in to support again." }); }
};
