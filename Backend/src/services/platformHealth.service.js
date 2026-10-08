const mongoose = require("mongoose");
const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const Audit = require("../models/staffAudit.model");
const settings = require("./platformSettings.service");
const TIMEOUT = 2000;
// Read-only probes are bounded even during disconnected database buffering.
async function probe(work, timeout = TIMEOUT) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Probe timed out")), timeout); })]);
  } finally { clearTimeout(timer); }
}
async function database() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return { status: "unavailable", message: "Database is disconnected or connecting." };
  const start = performance.now();
  try {
    await probe(() => mongoose.connection.db.command({ ping: 1 }, { timeoutMS: TIMEOUT }));
    return { status: "healthy", message: "Database ping succeeded.", latencyMs: Math.round(performance.now() - start) };
  } catch { return { status: "unavailable", message: "Database ping failed or timed out." }; }
}
async function health(app) {
  const [db, uploads, audit, config] = await Promise.all([
    database(),
    probe(async () => { const dir = path.resolve("uploads"); if (!(await fs.stat(dir)).isDirectory()) throw new Error("Not a directory"); await fs.access(dir, constants.R_OK | constants.W_OK); return { status: "healthy", message: "Upload directory exists and read/write permission checks passed. Actual upload and disk capacity are untested." }; }).catch(() => ({ status: "unavailable", message: "Upload directory is missing or inaccessible." })),
    mongoose.connection.readyState === 1 ? probe(async () => { const count = await Audit.countDocuments({ outcome: "pending", attemptedAt: { $lt: new Date(Date.now() - 300000) } }).maxTimeMS(TIMEOUT); return { status: count ? "attention" : "healthy", pendingOverFiveMinutes: count, message: count ? "Review unfinished staff actions in the audit log." : "No audit entries have remained pending for over five minutes." }; }).catch(() => ({ status: "unavailable", message: "Unable to check unfinished audit entries." })) : Promise.resolve({ status: "unavailable", message: "Audit check requires a database connection." }),
    probe(() => settings.availability()).then((current) => ({ status: "healthy", message: "Settings can be read.", availability: current })).catch(() => ({ status: "unavailable", message: "Platform settings cannot be read." })),
  ]);
  const configured = { database: Boolean(process.env.DBSTRING?.trim()), authentication: Boolean(process.env.JWT_SECRET?.trim()), analytics: Boolean((process.env.ANALYTICS_SECRET || process.env.JWT_SECRET)?.trim()) };
  const io = app.get("io"), count = io?.of("/")?.sockets?.size;
  const realtime = Number.isSafeInteger(count) && count >= 0 ? { status: "healthy", connections: count, message: "Socket connections on this server instance; multiple tabs count separately." } : { status: "unavailable", connections: null, message: "Realtime server is not available on this instance." };
  const configuration = { status: Object.values(configured).every(Boolean) ? "healthy" : "attention", configured, message: "Presence checks only; integration credentials are not validated or displayed." };
  const checks = { database: db, uploads, audit, settings: config, realtime, configuration };
  const memory = process.memoryUsage();
  return { checkedAt: new Date(), status: Object.values(checks).every((c) => c.status === "healthy") ? "healthy" : "attention", runtime: { uptimeSeconds: Math.floor(process.uptime()), nodeVersion: process.version, memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal } }, checks };
}
module.exports = { probe, database, health };
