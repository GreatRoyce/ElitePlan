const mongoose = require("mongoose");

const initialConsultationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["Planner", "Vendor"],
      required: true,
    },

    fullName: { type: String, required: true },
    eventType: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventTime: { type: String },

    eventLocation: {
      state: { type: String },
      city: { type: String },
      country: { type: String },
    },

    guests: {
      min: { type: Number },
      max: { type: Number },
    },

    services: [{ type: String }],
    vendorType: [{ type: String }],

    notes: { type: String },
    consent: { type: Boolean, default: false },
    contactMethod: { type: String },

    status: {
      type: String,
      enum: ["pending", "approved", "declined", "completed"],
      default: "pending",
    },
    remarks: { type: String },

    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true } // 👈 handles createdAt + updatedAt
);

// ✅ Validation
initialConsultationSchema.pre("validate", function (next) {
  const guests = this.guests;
  if (guests?.min != null && guests?.max != null && guests.max < guests.min) {
    return next(new Error("Maximum guests cannot be less than minimum guests"));
  }
  next();
});

// ✅ Indexes
initialConsultationSchema.index({ user: 1 });
initialConsultationSchema.index({ targetUser: 1 });
initialConsultationSchema.index({ targetType: 1 });

// ✅ Virtuals
initialConsultationSchema.virtual("client", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
});

initialConsultationSchema.virtual("receiver", {
  ref: "User",
  localField: "targetUser",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model(
  "InitialConsultation",
  initialConsultationSchema
);
