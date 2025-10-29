const mongoose = require("mongoose");
const { Schema } = mongoose;

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
    specialization: {
      type: [String],
      enum: [
        "Wedding Planning",
        "Corporate Events",
        "Social Gatherings",
        "Luxury Events",
        "Destination Planning",
        "Cultural Ceremonies",
        "Non-Profit Events",
        "Other",
      ],
      default: [],
    },
    yearsExperience: { type: Number, min: 0 },
    shortBio: { type: String, maxlength: 250 },
    plannerType: {
      type: String,
      enum: ["corporate", "wedding", "social", "non-profit", "other"],
    },

    // ========== Location ==========
    country: { type: String, default: "Nigeria" },
    state: { type: String },
    serviceRegions: {
      type: [String],
      default: [],
    },

    // ========== Services & Skills ==========
    eventTypesHandled: {
      type: [String],
      enum: [
        "Conferences",
        "Concerts",
        "Product Launches",
        "Weddings",
        "Festivals",
        "Workshops",
        "Private Parties",
        "Award Ceremonies",
        "Other",
      ],
      default: [],
    },
    languagesSpoken: {
      type: [String],
      enum: [
        "English",
        "French",
        "Spanish",
        "Arabic",
        "Yoruba",
        "Igbo",
        "Hausa",
        "Swahili",
        "Other",
      ],
      default: [],
    },
    preferredVendorCategories: {
      type: [String],
      enum: [
        "Catering",
        "Photography",
        "Decoration",
        "Entertainment",
        "Logistics",
        "Venue",
        "Security",
        "Rentals",
        "Makeup",
        "Fashion",
        "Other",
      ],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },

    // ========== Social & Portfolio ==========
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
    },
    ongoingProjects: { type: Number, default: 0 },

    // ========== Platform Data ==========
    rating: { type: Number, default: 0 },
    reviews: [
      {
        reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true },
        date: { type: Date, default: Date.now },
      },
    ],
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },

    // ========== Administrative ==========
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Optional: Automatically update `lastUpdated` before save
plannerProfileSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("PlannerProfile", plannerProfileSchema);
