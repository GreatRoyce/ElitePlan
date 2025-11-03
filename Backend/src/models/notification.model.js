const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId, // recipient ID
      required: true,
      refPath: "userModel", // dynamic reference (PlannerProfile, VendorProfile, User, etc.)
    },

    userModel: {
      type: String,
      required: true,
      enum: ["User", "PlannerProfile", "VendorProfile", "ClientProfile"],
    },

    sender: {
      type: Schema.Types.ObjectId,
      refPath: "senderModel", // dynamic ref for sender type
    },

    senderModel: {
      type: String,
      enum: ["User", "PlannerProfile", "VendorProfile", "ClientProfile"],
    },

    message: { type: String, required: true },
    type: { type: String, default: "general" },
    isRead: { type: Boolean, default: false },

    imageCover: { type: String }, // <-- new field for optional image URL/path
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
