const mongoose = require("mongoose");
const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
    },
    location: {
      type: String,
    },
    planner: {
      type: Schema.Types.ObjectId,
      ref: "PlannerProfile", // ✅ must match your actual model name
      required: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "ClientProfile",
    },
    vendors: [
      {
        type: Schema.Types.ObjectId,
        ref: "VendorProfile",
      },
    ],
    status: {
      type: String,
      enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
