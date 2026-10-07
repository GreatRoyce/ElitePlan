// models/user.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { permissions } = require("../services/staffAccess.service");

const UserSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: { type: String, required: true },

    accountStatus: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
    suspendedUntil: { type: Date, default: null },
    moderationReason: { type: String, maxlength: 1000, default: null },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
    moderationVersion: { type: Number, default: 0 },
    authVersion: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    archiveReason: { type: String, maxlength: 1000, default: null },
    moderatorPermissions: [{ type: String, enum: permissions }],
    staffMemberRole: { type: String, enum: ["client", "vendor", "planner"], default: null },
    staffHistory: [{
      action: { type: String, enum: ["appoint", "update", "revoke"], required: true },
      reason: { type: String, required: true, maxlength: 1000 },
      by: { type: Schema.Types.ObjectId, ref: "User", required: true },
      at: { type: Date, required: true },
      permissions: [{ type: String, enum: permissions }],
      memberRole: { type: String, enum: ["client", "vendor", "planner"], required: true },
    }],
    lastWarning: {
      id: String,
      reason: { type: String, maxlength: 1000 },
      issuedAt: Date,
      acknowledgedAt: { type: Date, default: null },
    },
    moderationHistory: [{
      action: { type: String, enum: ["warn", "suspend", "ban", "restore", "archive", "unarchive"], required: true },
      reason: { type: String, required: true, maxlength: 1000 },
      by: { type: Schema.Types.ObjectId, ref: "User", required: true },
      at: { type: Date, required: true },
      until: { type: Date, default: null },
    }],

    role: {
      type: String,
      enum: ["client", "vendor", "planner", "admin", "moderator"],
      required: true,
    },

    // This links the user to their role-specific profile
    profile: {
      type: Schema.Types.ObjectId,
      refPath: "roleProfileModel",
    },

    // This tells mongoose which model to use for `profile`
    roleProfileModel: {
      type: String,
      enum: ["ClientProfile", "VendorProfile", "PlannerProfile"],
    },
  },
  { timestamps: true }
);

UserSchema.index({ createdAt: -1, _id: -1 });
UserSchema.index({ role: 1, createdAt: -1, _id: -1 });
UserSchema.index({ archivedAt: -1, _id: -1 });

module.exports = mongoose.model("User", UserSchema);
