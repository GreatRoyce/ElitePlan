const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const plannerProfileSchema = new Schema(
  {
    // ========== Data Source ==========
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ========== Basic Info ==========
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phonePrimary: { type: String, trim: true },
    companyName: { type: String, required: true, trim: true },

    // ========== Profile & Visuals ==========
    profileImage: { type: String },
    gallery: [{ type: String }],

    // ========== Professional Details ==========
    specialization: [{ type: String }],
    yearsExperience: { type: Number, min: 0 },
    shortBio: { type: String, maxlength: 1000 },
    plannerType: {
      type: String,
      enum: ["corporate", "wedding", "social", "non-profit", "other"],
    },

    // ========== Location ==========
    state: { type: String },
    country: { type: String, default: "Nigeria" },
    serviceRegions: [{ type: String }],

    // ========== Services & Skills ==========
    eventTypesHandled: [{ type: String }],
    languagesSpoken: [{ type: String }],
    preferredVendorCategories: [{ type: String }],
    certifications: [{ type: String }],

    // ========== Social & Portfolio ==========
    socialLinks: {
      facebook: String,
      instagram: String,
      tiktok: String,
      linkedin: String,
    },
    ongoingProjects: { type: Number, default: 0 },

    // ========== Platform Data ==========
    rating: { type: Number, default: 0 },
    reviews: [
      {
        reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true },
        comment: String,
        date: { type: Date, default: Date.now },
      },
    ],
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },

    // ========== Administrative Fields ==========
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlannerProfile", plannerProfileSchema);
