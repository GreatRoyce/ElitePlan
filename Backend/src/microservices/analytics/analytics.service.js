const { createHmac } = require("node:crypto");

const DAY = 86400000;
const TIMEZONE = "Africa/Lagos";
const paths = new Set(["/", "/features-section", "/why-choose-section", "/how-it-works", "/login", "/register", "/lounge", "/clientpresence", "/suite", "/consult"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function validateVisit(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const allowed = ["eventId", "visitorId", "sessionId", "path", "referrerHost"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return null;
  if (![body.eventId, body.visitorId, body.sessionId].every((id) => typeof id === "string" && uuid.test(id))) return null;
  if (typeof body.path !== "string" || !paths.has(body.path)) return null;
  const referrerHost = body.referrerHost ?? "";
  if (typeof referrerHost !== "string" || referrerHost.length > 253 || (referrerHost && !hostname.test(referrerHost.toLowerCase()))) return null;
  return { ...body, referrerHost: referrerHost.toLowerCase() };
}

function anonymizeVisit(visit, secret) {
  const hash = (purpose, id) => createHmac("sha256", secret).update(`${purpose}:${id.toLowerCase()}`).digest("hex");
  return {
    eventId: visit.eventId.toLowerCase(),
    visitorKey: hash("visitor", visit.visitorId),
    sessionKey: hash("session", `${visit.visitorId}:${visit.sessionId}`),
    path: visit.path,
    referrerHost: visit.referrerHost,
  };
}

const lagosDay = (date) => new Date(date.getTime() + 3600000).toISOString().slice(0, 10);
function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseRange(query, now = new Date()) {
  const today = lagosDay(now);
  let start;
  let end;
  if (query.start !== undefined || query.end !== undefined) {
    if (query.days !== undefined || !isDate(query.start) || !isDate(query.end)) return null;
    start = query.start;
    end = query.end;
  } else {
    const days = query.days === undefined ? 7 : Number(query.days);
    if (typeof query.days === "object" || ![7, 30, 90].includes(days)) return null;
    end = today;
    start = new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * DAY).toISOString().slice(0, 10);
  }
  const from = new Date(`${start}T00:00:00+01:00`);
  const until = new Date(new Date(`${end}T00:00:00+01:00`).getTime() + DAY);
  const days = (until - from) / DAY;
  if (end > today || days < 1 || days > 90 || start < new Date(Date.parse(`${today}T00:00:00Z`) - 89 * DAY).toISOString().slice(0, 10)) return null;
  return { start, end, days, from, until, timezone: TIMEZONE };
}

function reportPipeline(range) {
  return [
    { $match: { createdAt: { $gte: range.from, $lt: range.until } } },
    { $facet: {
      pageViews: [{ $count: "count" }],
      visitors: [{ $group: { _id: "$visitorKey" } }, { $count: "count" }],
      visits: [{ $group: { _id: "$sessionKey" } }, { $count: "count" }],
      daily: [
        { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: TIMEZONE } }, pageViews: { $sum: 1 }, visitors: { $addToSet: "$visitorKey" }, visits: { $addToSet: "$sessionKey" } } },
        { $project: { _id: 0, date: "$_id", pageViews: 1, visitors: { $size: "$visitors" }, visits: { $size: "$visits" } } },
        { $sort: { date: 1 } },
      ],
      pages: [
        { $group: { _id: "$path", pageViews: { $sum: 1 }, visitors: { $addToSet: "$visitorKey" } } },
        { $sort: { pageViews: -1, _id: 1 } }, { $limit: 10 },
        { $project: { _id: 0, path: "$_id", pageViews: 1, visitors: { $size: "$visitors" } } },
      ],
      referrers: [
        { $sort: { createdAt: 1, _id: 1 } },
        { $group: { _id: "$sessionKey", source: { $first: "$referrerHost" } } },
        { $group: { _id: "$source", visits: { $sum: 1 } } },
        { $sort: { visits: -1, _id: 1 } }, { $limit: 10 },
        { $project: { _id: 0, source: "$_id", visits: 1 } },
      ],
    } },
  ];
}

function formatReport(result = {}, range) {
  const daily = new Map((result.daily || []).map((row) => [row.date, row]));
  return {
    range: { start: range.start, end: range.end, days: range.days, timezone: TIMEZONE },
    totals: { pageViews: result.pageViews?.[0]?.count || 0, visitors: result.visitors?.[0]?.count || 0, visits: result.visits?.[0]?.count || 0 },
    daily: Array.from({ length: range.days }, (_, index) => {
      const date = lagosDay(new Date(range.from.getTime() + index * DAY));
      return daily.get(date) || { date, pageViews: 0, visitors: 0, visits: 0 };
    }),
    pages: result.pages || [],
    referrers: result.referrers || [],
  };
}

module.exports = { validateVisit, anonymizeVisit, parseRange, reportPipeline, formatReport };
