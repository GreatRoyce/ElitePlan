const mongoose = require("mongoose");
const { Schema } = mongoose;
const ReportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  requestId: { type: String, required: true, immutable: true },
  type: { type: String, enum: ["general", "account", "message", "consultation"], required: true, immutable: true },
  targetId: { type: Schema.Types.ObjectId, default: null, immutable: true },
  targetUser: { type: Schema.Types.ObjectId, ref: "User", default: null, immutable: true },
  targetLabel: { type: String, required: true, maxlength: 200, immutable: true },
  category: { type: String, enum: ["harassment", "spam", "fraud", "service", "staff_conduct", "other"], required: true, immutable: true },
  subject: { type: String, required: true, maxlength: 160, immutable: true },
  details: { type: String, required: true, maxlength: 5000, immutable: true },
  adminOnly: { type: Boolean, default: false, immutable: true },
  evidence: {
    text: { type: String, maxlength: 5000 },
    sentAt: Date,
    eventType: { type: String, maxlength: 200 },
    eventDate: Date,
    consultationStatus: String,
  },
  status: { type: String, enum: ["open", "under_review", "resolved", "dismissed"], default: "open" },
  priority: { type: String, enum: ["normal", "urgent"], default: "normal" },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolution: { type: String, maxlength: 2000, default: null },
  resolvedAt: { type: Date, default: null },
  version: { type: Number, default: 0 },
  history: [{
    action: { type: String, enum: ["claim", "assign", "release", "note", "priority", "resolve", "dismiss", "reopen"], required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true },
    note: { type: String, maxlength: 1000, required: true },
    status: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    priority: { type: String, required: true },
    resolution: { type: String, maxlength: 2000, default: null },
  }],
}, { timestamps: true });
ReportSchema.index({ reporter: 1, requestId: 1 }, { unique: true });
ReportSchema.index({ reporter: 1, createdAt: -1, _id: -1 });
ReportSchema.index({ adminOnly: 1, status: 1, createdAt: -1, _id: -1 });
ReportSchema.index({ assignedTo: 1, status: 1, createdAt: -1, _id: -1 });
module.exports = mongoose.model("Report", ReportSchema);
