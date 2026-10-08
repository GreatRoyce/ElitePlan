const mongoose = require("mongoose");
const { Schema } = mongoose;
const { categories, actions, targetKinds, outcomes } = require("../services/staffAudit.catalog");
const { permissions } = require("../services/staffAccess.service");
const settingsSnapshot = new Schema({ registration: { client: Boolean, vendor: Boolean, planner: Boolean }, consultationsEnabled: Boolean }, { _id: false });
const schema = new Schema({
  requestId: { type: String, required: true, immutable: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  actorName: { type: String, required: true, maxlength: 160, immutable: true },
  actorRole: { type: String, enum: ["admin", "moderator"], required: true, immutable: true },
  category: { type: String, enum: Object.keys(categories), required: true, immutable: true },
  action: { type: String, enum: actions, required: true, immutable: true },
  targetKind: { type: String, enum: targetKinds, required: true, immutable: true },
  targetId: { type: Schema.Types.ObjectId, default: null },
  method: { type: String, enum: ["POST", "PATCH"], required: true, immutable: true },
  route: { type: String, required: true, maxlength: 160, immutable: true },
  note: { type: String, maxlength: 1000, default: null, immutable: true },
  expectedVersion: { type: Number, min: 0, default: null, immutable: true },
  attemptedAt: { type: Date, required: true, immutable: true },
  completedAt: { type: Date, default: null },
  outcome: { type: String, enum: outcomes, default: "pending" },
  httpStatus: { type: Number, min: 100, max: 599, default: null },
  resultVersion: { type: Number, min: 0, default: null },
  resultState: { type: String, maxlength: 40, default: null },
  resultRole: { type: String, enum: ["client", "vendor", "planner", "admin", "moderator"], default: null },
  resultPermissions: { type: [String], enum: permissions, default: undefined },
  resultAssignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resultPriority: { type: String, enum: ["normal", "urgent"], default: null },
  settingsChange: { type: new Schema({ before: settingsSnapshot, after: settingsSnapshot }, { _id: false }), default: undefined },
});
schema.index({ requestId: 1 }, { unique: true });
schema.index({ attemptedAt: -1, _id: -1 });
schema.index({ actorId: 1, attemptedAt: -1, _id: -1 });
schema.index({ category: 1, attemptedAt: -1, _id: -1 });
schema.index({ targetId: 1, attemptedAt: -1, _id: -1 });
schema.index({ outcome: 1, attemptedAt: -1, _id: -1 });
module.exports = mongoose.model("StaffAudit", schema);
