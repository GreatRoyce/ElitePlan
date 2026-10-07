const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = {
  verificationStatus: { type: String, enum: ["unverified", "verified", "rejected", "revoked"], default: "unverified" },
  verificationVersion: { type: Number, default: 0, select: false },
  verificationReason: { type: String, maxlength: 1000, default: null, select: false },
  verificationAt: { type: Date, default: null },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, select: false },
  verifiedAt: { type: Date, default: null },
  verificationHistory: { type: [{
    action: { type: String, enum: ["approve", "reject", "revoke", "profile_updated"], required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, required: true },
  }], default: [], select: false },
};
