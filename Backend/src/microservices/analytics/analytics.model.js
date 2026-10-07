const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  visitorKey: { type: String, required: true },
  sessionKey: { type: String, required: true },
  path: { type: String, required: true },
  referrerHost: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

visitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("SiteVisit", visitSchema);
