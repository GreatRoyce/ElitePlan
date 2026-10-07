const { hasPermission, actionPermissions } = require("../services/staffAccess.service");

const adminOnly = (req, res, next) => req.user.role === "admin" ? next() : res.status(403).json({ success: false, message: "This action requires an admin." });
const requirePermission = (permission) => (req, res, next) => hasPermission(req.user, permission) ? next() : res.status(403).json({ success: false, message: "Your staff account does not have permission for this action." });
function requireModerationPermission(req, res, next) {
  if (req.user.role === "admin") return next();
  const permission = actionPermissions[req.body?.action];
  if (!permission || !hasPermission(req.user, "users.read") || !hasPermission(req.user, permission)) return res.status(403).json({ success: false, message: "Your moderator account cannot perform this action." });
  next();
}
module.exports = { adminOnly, requirePermission, requireModerationPermission };
