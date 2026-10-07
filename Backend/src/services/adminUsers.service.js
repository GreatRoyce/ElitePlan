const roles = ["client", "vendor", "planner", "admin", "moderator"];
const { accountStatus } = require("./accountAccess.service");
const sorts = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { username: 1, _id: 1 },
};
const accountFields = "_id username email phone role createdAt updatedAt accountStatus suspendedUntil archivedAt";
const detailFields = `${accountFields} moderationVersion moderationReason moderationHistory archivedBy archiveReason moderatorPermissions staffMemberRole staffHistory`;

function parseUserQuery(query, archived = false) {
  if (Object.keys(query).some((key) => !["search", "role", "status", "sort", "page", "pageSize"].includes(key))) return null;
  if (Object.values(query).some((value) => typeof value !== "string")) return null;
  const search = (query.search || "").trim();
  const role = query.role || "all";
  const status = query.status || "all";
  const sort = query.sort || "newest";
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  if (search.length > 100 || (role !== "all" && !roles.includes(role)) || !["all", "active", "suspended", "banned"].includes(status) || !Object.hasOwn(sorts, sort)) return null;
  if ((query.page !== undefined && !/^\d+$/.test(query.page)) || !Number.isSafeInteger(page) || page < 1 || page > 100000) return null;
  if ((query.pageSize !== undefined && !/^\d+$/.test(query.pageSize)) || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
  const filter = { archivedAt: archived ? { $ne: null } : null, ...(role === "all" ? {} : { role }) };
  const now = new Date();
  if (status === "banned") filter.accountStatus = "banned";
  if (status === "active") filter.$and = [{ $or: [{ accountStatus: { $in: ["active", null] } }, { accountStatus: "suspended", suspendedUntil: { $lte: now } }] }];
  if (status === "suspended") Object.assign(filter, { accountStatus: "suspended", $and: [{ $or: [{ suspendedUntil: { $gt: now } }, { suspendedUntil: null }] }] });
  if (search) {
    const specialCharacters = new Set(["\\", "^", "$", ".", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|"]);
    const literal = [...search].map((character) => specialCharacters.has(character) ? `\\${character}` : character).join("");
    filter.$or = ["username", "email", "phone"].map((field) => ({ [field]: { $regex: literal, $options: "i" } }));
  }
  const sortOrder = archived && sort !== "name" ? { archivedAt: sort === "newest" ? -1 : 1, _id: sort === "newest" ? -1 : 1 } : sorts[sort];
  return { filter, sortOrder, search, role, status, sort, page, pageSize };
}

function accountSummary(user) {
  const summary = Object.fromEntries(accountFields.split(" ").map((field) => [field, user[field] ?? null]));
  summary.accountStatus = accountStatus(user);
  summary.suspendedUntil = summary.accountStatus === "suspended" ? user.suspendedUntil || null : null;
  return summary;
}

function profileSummary(profile, role) {
  if (!profile) return null;
  const client = role === "client";
  const location = client ? profile.locationPreference : profile;
  return {
    _id: profile._id,
    role,
    name: profile.fullName || profile.contactPerson || null,
    organization: profile.businessName || profile.companyName || null,
    email: profile.email || null,
    phone: profile.phonePrimary || profile.phone || null,
    bio: profile.description || profile.shortBio || null,
    category: profile.category || null,
    specialization: Array.isArray(profile.specialization) ? profile.specialization : [],
    location: { city: location?.city || null, state: location?.state || null, country: location?.country || null },
    verified: client ? null : (typeof profile.verified === "boolean" ? profile.verified : null),
    listingActive: client ? null : (typeof profile.active === "boolean" ? profile.active : null),
  };
}

// Message IDs are polymorphic; match both the ID and its declared model.
function messageFilter(side, user, profile) {
  const conditions = [{ [side]: user._id, [`${side}Model`]: "User" }];
  const model = { client: "ClientProfile", vendor: "VendorProfile", planner: "PlannerProfile" }[user.role];
  if (profile && model && !(side === "sender" && user.role === "client")) conditions.push({ [side]: profile._id, [`${side}Model`]: model });
  return { $or: conditions };
}

module.exports = { parseUserQuery, accountFields, detailFields, accountSummary, profileSummary, messageFilter };
