const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientProfileSchema = new Schema(
  {
    // ========== Data Source ==========
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ========== Basic Info ==========
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    dateOfBirth: { type: Date },

    // ========== Profile & Visuals ==========
    imageCover: { type: String }, // single image (profile photo)
    

    locationPreference: {
      city: String,
      state: String,
      country: { type: String, default: "Nigeria" },
    },

    // ========== Administrative Fields ==========
    approvedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    dateApproved: { type: Date },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
