const mongoose = require("mongoose");
const { Schema } = mongoose;
const SupportTicketSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  requestId: { type: String, required: true, immutable: true },
  type: { type: String, enum: ["support", "appeal"], required: true, immutable: true },
  category: { type: String, enum: ["account_access", "profile", "technical", "billing", "other"], required: true, immutable: true },
  subject: { type: String, required: true, maxlength: 160, immutable: true },
  details: { type: String, required: true, maxlength: 5000, immutable: true },
  appeal: {
    kind: { type: String, enum: ["account", "listing", "verification"] },
    targetId: { type: Schema.Types.ObjectId },
    targetType: { type: String, enum: ["account", "vendor", "planner"] },
    version: Number, status: String,
    reason: { type: String, maxlength: 1000 },
    decisionBy: { type: Schema.Types.ObjectId, ref: "User", select: false },
  },
  status: { type: String, enum: ["open", "under_review", "waiting_member", "resolved", "rejected"], default: "open" },
  priority: { type: String, enum: ["normal", "urgent"], default: "normal", select: false },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, select: false },
  outcome: { type: String, enum: ["accepted", "resolved", "rejected"], default: null },
  resolution: { type: String, maxlength: 2000, default: null },
  closedAt: { type: Date, default: null },
  version: { type: Number, default: 0 },
  messages: [{
    requestId: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String, enum: ["member", "admin"], required: true },
    text: { type: String, maxlength: 2000, required: true },
    at: { type: Date, required: true },
  }],
  history: { type: [{
    action: { type: String, enum: ["claim", "release", "reply", "note", "priority", "request_info", "resolve", "reject", "accept", "reopen"], required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, maxlength: 1000, required: true },
    at: { type: Date, required: true },
  }], default: [], select: false },
}, { timestamps: true });
SupportTicketSchema.index({ owner: 1, requestId: 1 }, { unique: true });
SupportTicketSchema.index({ owner: 1, createdAt: -1, _id: -1 });
SupportTicketSchema.index({ status: 1, type: 1, createdAt: -1, _id: -1 });
module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
