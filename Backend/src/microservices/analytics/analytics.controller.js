const SiteVisit = require("./analytics.model");
const { validateVisit, anonymizeVisit, parseRange, reportPipeline, formatReport } = require("./analytics.service");

async function recordVisit(req, res) {
  if (/bot|crawler|spider|preview|headless/i.test(req.get("user-agent") || "")) return res.sendStatus(204);
  const visit = validateVisit(req.body);
  if (!visit) return res.status(400).json({ success: false, message: "Invalid visit data." });
  const secret = process.env.ANALYTICS_SECRET || process.env.JWT_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: "Visit tracking is unavailable." });
  try {
    await SiteVisit.create(anonymizeVisit(visit, secret));
    return res.sendStatus(204);
  } catch (error) {
    if (error.code === 11000) return res.sendStatus(204);
    console.error("Visit tracking failed:", error.message);
    return res.status(503).json({ success: false, message: "Visit tracking is unavailable." });
  }
}

async function getAnalytics(req, res) {
  const generatedAt = new Date();
  const range = parseRange(req.query, generatedAt);
  if (!range) return res.status(400).json({ success: false, message: "Choose a valid date range within the last 90 days, or days=7, 30, or 90." });
  try {
    const [result] = await SiteVisit.aggregate(reportPipeline(range));
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: { ...formatReport(result, range), generatedAt } });
  } catch (error) {
    console.error("Site analytics failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load site analytics." });
  }
}

module.exports = { recordVisit, getAnalytics };
