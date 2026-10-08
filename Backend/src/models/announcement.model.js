const mongoose = require("mongoose");
const { Schema } = mongoose;
const schema = new Schema({
  title: { type: String, required: true, maxlength: 160 },
  body: { type: String, required: true, maxlength: 5000 },
  audiences: { type: [String], enum: ["public", "client", "vendor", "planner"], required: true },
  important: { type: Boolean, default: false },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  status: { type: String, enum: ["draft", "published", "withdrawn", "archived"], default: "draft" },
  version: { type: Number, default: 0 },
  publicationVersion: { type: Number, default: 0 },
  publishedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true, select: false },
  requestId: { type: String, required: true, immutable: true, select: false },
  submissionHash: { type: String, required: true, immutable: true, select: false },
  history: { type: [{ action: { type: String, enum: ["create", "update", "publish", "withdraw", "archive"], required: true }, by: { type: Schema.Types.ObjectId, ref: "User", required: true }, note: { type: String, required: true, maxlength: 1000 }, at: { type: Date, required: true } }], default: [], select: false },
}, { timestamps: true });
schema.index({ createdBy: 1, requestId: 1 }, { unique: true });
schema.index({ status: 1, audiences: 1, startsAt: -1, _id: -1 });
module.exports = mongoose.model("Announcement", schema);
