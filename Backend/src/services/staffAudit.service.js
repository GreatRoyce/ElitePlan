const { categories, actions, targetKinds, outcomes, idValid } = require("./staffAudit.catalog");
const fields = "_id requestId actorId actorName actorRole category action targetKind targetId method route note expectedVersion attemptedAt completedAt outcome httpStatus resultVersion resultState resultRole resultPermissions resultAssignedTo resultPriority settingsChange";
function day(value, end = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+01:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 3600000).toISOString().slice(0, 10) !== value || date.getUTCFullYear() < 1999 || date.getUTCFullYear() > 2100) return null;
  return end ? new Date(date.getTime() + 86400000) : date;
}
function parseQuery(query) {
  const keys = ["category", "action", "outcome", "actorId", "targetId", "targetKind", "from", "to", "page", "pageSize"];
  if (Object.keys(query).some((k) => !keys.includes(k)) || Object.values(query).some((v) => typeof v !== "string")) return null;
  const page = query.page === undefined ? 1 : Number(query.page), pageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || ["page", "pageSize"].some((k) => query[k] !== undefined && !/^\d+$/.test(query[k]))) return null;
  const filter = {};
  for (const [k, allowed] of [["category", Object.keys(categories)], ["action", actions], ["outcome", outcomes], ["targetKind", targetKinds]]) {
    const value = query[k] || "all";
    if (value !== "all") { if (!allowed.includes(value)) return null; filter[k] = value; }
  }
  for (const k of ["actorId", "targetId"]) if (query[k]) { if (!idValid(query[k])) return null; filter[k] = query[k].toLowerCase(); }
  const from = query.from ? day(query.from) : null, to = query.to ? day(query.to, true) : null;
  if (query.from && !from || query.to && !to || from && to && from >= to) return null;
  if (from || to) filter.attemptedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
  return { filter, page, pageSize };
}
function targetLink(entry) {
  if (entry.targetKind === "platform") return "/admin/platform";
  if (!idValid(String(entry.targetId))) return null;
  const id = String(entry.targetId);
  if (entry.targetKind === "account") return `/admin/users/${id}`;
  if (["vendor", "planner"].includes(entry.targetKind)) return `/admin/${entry.category === "verification" ? "verification" : "content"}/${entry.targetKind}/${id}`;
  if (["consultations", "events", "planner-events"].includes(entry.targetKind)) return `/admin/operations/${entry.targetKind}/${id}`;
  return { report: `/admin/reports/${id}`, support: `/admin/support/${id}`, announcement: `/admin/announcements/${id}`, advert: `/admin/adverts/${id}` }[entry.targetKind] || null;
}
function dto(entry, now = Date.now()) {
  return { ...Object.fromEntries(fields.split(" ").map((k) => [k, entry[k] ?? null])), targetLink: targetLink(entry), completionUnconfirmed: entry.outcome === "unconfirmed" || entry.outcome === "pending" && new Date(entry.attemptedAt).getTime() < now - 300000 };
}
module.exports = { fields, parseQuery, dto, day };
