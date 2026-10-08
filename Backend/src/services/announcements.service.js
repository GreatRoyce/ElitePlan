const { createHash } = require("node:crypto");
const audiences = ["public", "client", "vendor", "planner"];
const states = ["draft", "scheduled", "live", "expired", "withdrawn", "archived"];
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" ? v.trim() : "";
const idValid = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
const uuidValid = (v) => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const projection = "+createdBy +history";
function date(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const parsed = new Date(value);
  const [hour, minute, second] = value.slice(11, 19).split(":").map(Number);
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() < 2000 || parsed.getUTCFullYear() > 2100) return undefined;
  // Reject calendar overflow (e.g. February 30), which Date otherwise normalizes.
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return undefined;
  return parsed;
}
function content(body) {
  if (!object(body)) return null;
  const title = text(body.title), message = text(body.body), startsAt = date(body.startsAt), endsAt = date(body.endsAt);
  if (title.length < 3 || title.length > 160 || message.length < 10 || message.length > 5000 || !Array.isArray(body.audiences) || !body.audiences.length || body.audiences.length > 4 || body.audiences.some((a) => !audiences.includes(a)) || new Set(body.audiences).size !== body.audiences.length || typeof body.important !== "boolean" || startsAt === undefined || endsAt === undefined || endsAt && startsAt && endsAt <= startsAt) return null;
  return { title, body: message, audiences: [...body.audiences].sort(), important: body.important, startsAt, endsAt };
}
const hash = (payload) => createHash("sha256").update(JSON.stringify(payload)).digest("hex");
function state(a, now = new Date()) {
  if (a.status !== "published") return a.status;
  if (a.endsAt && new Date(a.endsAt) <= now) return "expired";
  return a.startsAt && new Date(a.startsAt) > now ? "scheduled" : "live";
}
function liveFilter(now, role) {
  return { status: "published", audiences: { $in: role ? ["public", role] : ["public"] }, startsAt: { $lte: now }, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] };
}
function stateFilter(value, now) {
  if (value === "all") return {};
  if (["draft", "withdrawn", "archived"].includes(value)) return { status: value };
  if (value === "expired") return { status: "published", endsAt: { $ne: null, $lte: now } };
  const end = { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] };
  return { status: "published", startsAt: value === "live" ? { $lte: now } : { $gt: now }, ...end };
}
function parseQuery(query, staff = false) {
  if (Object.keys(query).some((k) => !(staff ? ["state", "audience", "page", "pageSize"] : ["page", "pageSize"]).includes(k)) || Object.values(query).some((v) => typeof v !== "string")) return null;
  const page = query.page === undefined ? 1 : Number(query.page), pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if (![page, pageSize].every(Number.isSafeInteger) || page < 1 || page > 100000 || pageSize < 1 || pageSize > 50 || ["page", "pageSize"].some((k) => query[k] !== undefined && !/^\d+$/.test(query[k])) || staff && (query.state && query.state !== "all" && !states.includes(query.state) || query.audience && query.audience !== "all" && !audiences.includes(query.audience))) return null;
  return { page, pageSize, state: query.state || "all", audience: query.audience || "all" };
}
function dto(a, staff = false, detail = false, now = new Date()) {
  return { _id: a._id, title: a.title, body: a.body, important: a.important === true, startsAt: a.startsAt || null, endsAt: a.endsAt || null, publishedAt: a.publishedAt || null, publicationVersion: a.publicationVersion || 0,
    ...(staff ? { status: a.status, state: state(a, now), audiences: a.audiences, version: a.version || 0, createdAt: a.createdAt, updatedAt: a.updatedAt, ...(detail ? { createdBy: a.createdBy, history: (a.history || []).slice(-100).reverse().map((h) => ({ _id: h._id, action: h.action, by: h.by, note: h.note, at: h.at })) } : {}) } : {}) };
}
module.exports = { audiences, states, object, text, idValid, uuidValid, projection, content, hash, state, liveFilter, stateFilter, parseQuery, dto, date };
