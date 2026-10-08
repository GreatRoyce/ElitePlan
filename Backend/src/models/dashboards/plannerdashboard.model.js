const mongoose = require("mongoose");
const { Schema } = mongoose;

// Sub-schema for vendor assignments to an event
const vendorAssignmentSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: "VendorProfile", required: true },
  role: { type: String }, // e.g. "Decorator", "Caterer", "Photographer"
  joinedAt: { type: Date, default: Date.now },
});

const eventSchema = new Schema({
  ...require("../oversight.fields"),
  name: { type: String, required: true },
  date: { type: Date, required: true },
  client: { type: Schema.Types.ObjectId, ref: "ClientProfile", required: true },
  status: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled"],
    default: "upcoming",
  },
  payments: [
    {
      amount: { type: Number, required: true, min: 0 },
      status: { type: String, enum: ["pending", "paid"], default: "pending" },
      method: { type: String },
      date: { type: Date, default: Date.now },
    },
  ],
  vendors: [vendorAssignmentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

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

// ✅ Fixed: properly nested upcomingDeadlines
const plannerDashboardSchema = new Schema(
  {
    planner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    events: [eventSchema],
    metrics: {
      totalEvents: { type: Number, default: 0 },
      completedEvents: { type: Number, default: 0 },
      pendingPayments: { type: Number, default: 0 },
    },
    ratings: [
      {
        client: { type: Schema.Types.ObjectId, ref: "User", required: true },
        score: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0 },
    notifications: [notificationSchema],

    upcomingDeadlines: [
      {
        title: { type: String },
        dueDate: { type: Date },
        event: { type: Schema.Types.ObjectId, ref: "Event" },
      },
    ],
  },
  { timestamps: true, optimisticConcurrency: true },
);

module.exports = mongoose.model("PlannerDashboard", plannerDashboardSchema);
