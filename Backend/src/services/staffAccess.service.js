const memberRoles = ["client", "vendor", "planner"];
const publicOwnerMatch = { archivedAt: null, role: { $in: memberRoles } };
const permissionOptions = [
  { key: "users.read", label: "Review users", description: "Search member accounts and review profiles, activity totals, and recent moderation history." },
  { key: "users.warn", label: "Issue warnings", description: "Send account warnings to active members." },
  { key: "users.suspend", label: "Suspend accounts", description: "Suspend member access for up to 90 days." },
  { key: "users.ban", label: "Ban accounts", description: "Block member access until it is restored." },
  { key: "users.restore", label: "Restore access", description: "Lift member bans and suspensions." },
  { key: "analytics.read", label: "View site analytics", description: "Read visitor and page activity reports." },
  { key: "reports.read", label: "Review reports", description: "Read member reports and complaints, excluding cases involving staff." },
  { key: "reports.manage", label: "Manage reports", description: "Claim, review, prioritize, and resolve cases. Requires Review reports." },
  { key: "content.read", label: "Review published content", description: "Review professional profile text, media links, and content moderation history." },
  { key: "content.manage", label: "Moderate published content", description: "Hide and restore professional listings. Requires Review published content." },
];
const permissions = permissionOptions.map((option) => option.key);
const actionPermissions = { warn: "users.warn", suspend: "users.suspend", ban: "users.ban", restore: "users.restore" };

function grantedPermissions(user) {
  return user.role === "admin" ? [...permissions] : user.role === "moderator" && Array.isArray(user.moderatorPermissions) ? permissions.filter((permission) => user.moderatorPermissions.includes(permission)) : [];
}
function hasPermission(user, permission) { return grantedPermissions(user).includes(permission); }
function staffSummary(user) {
  return {
    permissions: user.role === "moderator" ? grantedPermissions(user) : [],
    memberRole: memberRoles.includes(user.staffMemberRole) ? user.staffMemberRole : null,
    history: (user.staffHistory || []).slice(-100).reverse().map((entry) => ({ _id: entry._id, action: entry.action, reason: entry.reason, by: entry.by, at: entry.at, permissions: entry.permissions || [], memberRole: entry.memberRole })),
    permissionOptions,
  };
}
module.exports = { memberRoles, publicOwnerMatch, permissions, permissionOptions, actionPermissions, grantedPermissions, hasPermission, staffSummary };
