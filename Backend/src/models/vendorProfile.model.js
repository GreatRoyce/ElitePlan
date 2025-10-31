const mongoose = require("mongoose");

const VendorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  businessName: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phonePrimary: { type: String, required: true, trim: true },
  phoneSecondary: { type: String, trim: true },
  alternateContact: { type: String, trim: true },
  password: { type: String, select: false },
  tagline: { type: String, maxlength: 120 },
  profileImage: { type: String },
  portfolioImages: [{ type: String }],
  introVideo: { type: String },
  gallery: [{ type: String }],

  category : {
    type: String,
    enum: [
      "Venue & Accommodation",
      "Food & Beverage",
      "Entertainment & Hosting",
      "Decor & Ambience",
      "Guest Experience",
      "Security & Logistics",
      "Media & Documentation",
      "Fashion & Beauty",
      "Transport & Rentals",
      "Print & Branding",
      "Tech & Digital",
      "Health & Safety",
      "Traditional Engagement",
      "Kids Entertainment",
      "Cleaning Services",
    ],
    default: "Venue & Accommodation",
    required: true,
  },
  subcategory: [{ type: String }], // always an array
  description: { type: String, maxlength: 350 },
  yearsExperience: { type: Number, min: 0 },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String, default: "Nigeria" },
  operatingHours: {
    startTime: String,
    endTime: String,
    daysAvailable: [{ type: String }],
  },
  priceRange: {
    min: Number,
    max: Number,
  },
  paymentMethods: [{ type: String }],

  socialLinks: {
    facebook: String,
    instagram: String,
    tiktok: String,
    linkedin: String,
  },
  website: String,
  whatsappLink: String,

  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  jobsCompleted: { type: Number, default: 0 },
  dateRegistered: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },

  details: {}, // optional, category-specific details

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  dateApproved: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("VendorProfile", VendorProfileSchema);
