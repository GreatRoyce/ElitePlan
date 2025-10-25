const mongoose = require("mongoose");

const clientDashboardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Example dashboard data
    bookings: [
      {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
        eventType: String,
        date: Date,
        status: {
          type: String,
          enum: ["pending", "confirmed", "completed", "cancelled"],
          default: "pending",
        },
      },
    ],

    payments: [
      {
        bookingId: { type: mongoose.Schema.Types.ObjectId },
        amount: Number,
        status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
        date: { type: Date, default: Date.now },
      },
    ],

    bookmarks: [
      {
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
        addedAt: { type: Date, default: Date.now },
      },
    ],

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
