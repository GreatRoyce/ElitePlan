const mongoose = require("mongoose");

const senderSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    fullName: { type: String, required: true },
    businessName: { type: String, default: "" },
    imageCover: { type: String, default: "" },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, refPath: "userModel", required: true },
    userModel: { type: String, enum: ["PlannerProfile", "VendorProfile", "ClientProfile"], required: true },
    sender: { type: senderSchema, required: true },
    senderModel: { type: String, enum: ["PlannerProfile", "VendorProfile", "ClientProfile", "User"], required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["consultation", "message", "booking"], default: "consultation" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
