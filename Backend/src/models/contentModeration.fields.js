const mongoose = require("mongoose");

module.exports = {
  contentReason: { type: String, maxlength: 1000, select: false },
  contentAt: { type: Date },
  contentHistory: { type: [{
    action: { type: String, enum: ["hide", "restore"], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true },
    reason: { type: String, maxlength: 1000, required: true },
  }], select: false, default: [] },
};
