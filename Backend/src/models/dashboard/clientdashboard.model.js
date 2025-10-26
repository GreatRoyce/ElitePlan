const mongoose = require("mongoose");

const clientDashboardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // 🗓️ Bookings made by client
    bookings: [
      {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProfile" },
        planner: { type: mongoose.Schema.Types.ObjectId, ref: "PlannerProfile" },
        eventType: String,
        date: Date,
        status: {
          type: String,
          enum: ["pending", "confirmed", "completed", "cancelled"],
          default: "pending",
        },
      },
    ],

    // 💳 Payments for bookings
    payments: [
      {
        bookingId: { type: mongoose.Schema.Types.ObjectId },
        amount: Number,
        status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
        date: { type: Date, default: Date.now },
      },
    ],

    // 🔖 Bookmarks — can be either vendor or planner
    bookmarks: [
      {
        type: {
          type: String,
          enum: ["vendor", "planner"],
          required: true,
        },
        refId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "bookmarks.type", // dynamic reference
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // 🔔 Notifications
    notifications: [
      {
        message: String,
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientDashboard", clientDashboardSchema);
