const common = require("./announcements.service");
const placements = ["home", "dashboard"];
const fields = ["sponsor", "title", "body", "destinationUrl", "ctaLabel", "imageUrl", "imageAlt", "placements", "audiences", "startsAt", "endsAt"];
function url(value, image = false) {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) {
    if (image && !/^\/uploads\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|gif|webp)$/i.test(value)) return null;
    return value;
  }
  try { const parsed = new URL(value); return parsed.protocol === "https:" && parsed.hostname && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}
function content(body) {
  if (!common.object(body)) return null;
  const sponsor = common.text(body.sponsor), title = common.text(body.title), message = common.text(body.body), ctaLabel = common.text(body.ctaLabel), imageAlt = common.text(body.imageAlt);
  const destinationUrl = url(body.destinationUrl), imageUrl = body.imageUrl === "" ? "" : url(body.imageUrl, true);
  const startsAt = common.date(body.startsAt), endsAt = common.date(body.endsAt);
  if (sponsor.length < 2 || sponsor.length > 100 || title.length < 3 || title.length > 120 || typeof body.body !== "string" || message.length > 700 || ctaLabel.length < 2 || ctaLabel.length > 40 || !destinationUrl || imageUrl === null || typeof body.imageAlt !== "string" || imageAlt.length > 160 || imageUrl && !imageAlt || startsAt === undefined || endsAt === undefined || startsAt && endsAt && endsAt <= startsAt) return null;
  for (const [key, allowed] of [["placements", placements], ["audiences", common.audiences]]) if (!Array.isArray(body[key]) || !body[key].length || body[key].length > allowed.length || body[key].some((v) => !allowed.includes(v)) || new Set(body[key]).size !== body[key].length) return null;
  return { sponsor, title, body: message, destinationUrl, ctaLabel, imageUrl, imageAlt, placements: [...body.placements].sort(), audiences: [...body.audiences].sort(), startsAt, endsAt };
}
function parseQuery(query, staff = false) {
  if (staff) {
    const { placement, ...rest } = query;
    if (placement !== undefined && (typeof placement !== "string" || placement !== "all" && !placements.includes(placement))) return null;
    const parsed = common.parseQuery(rest, true); return parsed && { ...parsed, placement: placement || "all" };
  }
  if (Object.keys(query).some((key) => key !== "placement") || typeof query.placement !== "string" || !placements.includes(query.placement)) return null;
  return { placement: query.placement };
}
function liveFilter(now, role, placement) { return { ...common.liveFilter(now, role), placements: placement }; }
function dto(a, staff = false, detail = false, now = new Date()) {
  return { _id: a._id, sponsor: a.sponsor, title: a.title, body: a.body, destinationUrl: a.destinationUrl, ctaLabel: a.ctaLabel, imageUrl: a.imageUrl, imageAlt: a.imageAlt, startsAt: a.startsAt || null, endsAt: a.endsAt || null, publicationVersion: a.publicationVersion || 0,
    ...(staff ? { status: a.status, state: common.state(a, now), placements: a.placements, audiences: a.audiences, version: a.version || 0, publishedAt: a.publishedAt || null, createdAt: a.createdAt, updatedAt: a.updatedAt, ...(detail ? { createdBy: a.createdBy, history: (a.history || []).slice(-100).reverse().map((h) => ({ _id: h._id, action: h.action, by: h.by, note: h.note, at: h.at })) } : {}) } : {}) };
}
module.exports = { ...common, placements, fields, url, content, parseQuery, liveFilter, dto };
