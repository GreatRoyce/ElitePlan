const mongoose = require("mongoose");

module.exports = {
  oversightVersion: { type: Number, min: 0, default: 0, select: false },
  oversightFlag: { type: Boolean, default: false, select: false },
  oversightNotice: { reason: { type: String, maxlength: 1000 }, at: Date },
  oversightHistory: { type: [{
    action: { type: String, enum: ["note", "flag", "clear_flag", "decline", "complete", "start", "cancel", "reopen", "member_status"], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, maxlength: 1000, required: true },
    at: { type: Date, required: true },
    from: String, to: String,
  }], default: [], select: false },
};
