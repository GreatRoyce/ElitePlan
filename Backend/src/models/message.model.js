// models/message.model.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "senderModel" },
    senderModel: { type: String, required: true, enum: ["PlannerProfile", "VendorProfile", "User"] },

    recipient: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "recipientModel" },
    recipientModel: { type: String, required: true, enum: ["PlannerProfile", "VendorProfile", "ClientProfile", "User"] },

    text: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
