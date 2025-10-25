const mongoose = require("mongoose");
const { Schema } = mongoose;

// ================================
// 🧩 Sub-Schemas
// ================================

// Product or service order
const orderSchema = new Schema({
  title: { type: String, required: true },
  client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
  event: { type: Schema.Types.ObjectId, ref: "Event" },
  status: {
    type: String,
    enum: ["pending", "accepted", "in-progress", "completed", "cancelled"],
    default: "pending",
  },
  totalAmount: { type: Number, default: 0 },
  payments: [
    {
      amount: { type: Number, required: true },
      status: { type: String, enum: ["pending", "paid"], default: "pending" },
      date: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Notifications
const notificationSchema = new Schema({
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["info", "alert", "warning", "success"],
    default: "info",
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// ================================
// 🧮 Main Dashboard Schema
// ================================

const vendorDashboardSchema = new Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true,
    },

    // Core business metrics
    pendingOrders: { type: Number, default: 0 },
    acceptedOrders: { type: Number, default: 0 },
    ongoingOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },

    // Financial tracking
    totalRevenue: { type: Number, default: 0 },
    pendingRevenue: { type: Number, default: 0 },

    // Feedback & ratings
    ratings: [
      {
        client: { type: Schema.Types.ObjectId, ref: "Client" },
        score: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],

    averageRating: { type: Number, default: 0 },

    // Communication & alerts
    notifications: [notificationSchema],

    // Orders (acts like “events” in planner dashboard)
    orders: [orderSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("VendorDashboard", vendorDashboardSchema);
