function accountStatus(user, now = new Date()) {
  if (user.archivedAt) return "archived";
  if (user.accountStatus === "banned") return "banned";
  if (user.accountStatus === "suspended") {
    const until = user.suspendedUntil ? new Date(user.suspendedUntil).getTime() : NaN;
    return Number.isFinite(until) && until <= now.getTime() ? "active" : "suspended";
  }
  return "active";
}

function accountRestriction(user, now = new Date()) {
  const status = accountStatus(user, now);
  if (status === "active") return null;
  if (status === "archived") return { code: "ACCOUNT_ARCHIVED", message: "Your account has been removed and archived. Contact support to request restoration.", suspendedUntil: null };
  const reason = user.moderationReason ? ` Reason: ${user.moderationReason}` : "";
  const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
  const expiry = until && Number.isFinite(until.getTime()) ? until.toISOString() : null;
  return {
    code: status === "banned" ? "ACCOUNT_BANNED" : "ACCOUNT_SUSPENDED",
    message: status === "banned" ? `Your account has been banned.${reason}` : `Your account is suspended${expiry ? ` until ${expiry}` : ""}.${reason}`,
    suspendedUntil: status === "suspended" ? expiry : null,
  };
}

function sessionRejection(user, decoded, now = new Date()) {
  if (!user) return { code: "SESSION_REVOKED", message: "Your session is no longer valid. Please sign in again." };
  const restriction = accountRestriction(user, now);
  if (restriction) return restriction;
  if ((decoded.authVersion ?? 0) !== (user.authVersion ?? 0)) return { code: "SESSION_REVOKED", message: "Your session is no longer valid. Please sign in again." };
  return null;
}

function currentWarning(user) {
  const warning = user.lastWarning;
  return warning?.id && !warning.acknowledgedAt ? { id: warning.id, reason: warning.reason, issuedAt: warning.issuedAt } : null;
}

function moderationSummary(user, now = new Date()) {
  const status = accountStatus(user, now);
  return {
    status,
    version: user.moderationVersion ?? 0,
    reason: status === "active" ? null : user.moderationReason || null,
    suspendedUntil: status === "suspended" ? user.suspendedUntil || null : null,
    history: (user.moderationHistory || []).slice(-100).reverse().map((item) => ({
      _id: item._id, action: item.action, reason: item.reason, by: item.by, at: item.at, until: item.until || null,
    })),
  };
}

module.exports = { accountStatus, accountRestriction, sessionRejection, currentWarning, moderationSummary };
