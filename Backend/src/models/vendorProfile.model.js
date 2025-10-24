const mongoose = require("mongoose");

const VendorProfileSchema = new mongoose.Schema({
  // ========== Data Source ==========
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ========== Basic Info ==========
  businessName: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phonePrimary: { type: String, required: true, trim: true },
  phoneSecondary: { type: String, trim: true },
  alternateContact: { type: String, trim: true },
  password: { type: String, select: false }, // hashed

  // ========== Profile & Visuals ==========
  profileImage: { type: String }, // logo or cover photo
  portfolioImages: [{ type: String }], // multiple uploads
  introVideo: { type: String }, // optional
  gallery: [{ type: String }],

  // ========== Business Details ==========
  category: {
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
    required: true,
  },
  subcategory: { type: String },
  description: { type: String, maxlength: 1000 },
  yearsExperience: { type: Number, min: 0 },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String, default: "Nigeria" },
  operatingHours: {
    startTime: String,
    endTime: String,
    daysAvailable: [String], // e.g. ["Mon", "Tue", "Wed"]
  },
  priceRange: {
    min: Number,
    max: Number,
  },
  paymentMethods: [String],

  // ========== Professional Presence ==========
  socialLinks: {
    facebook: String,
    instagram: String,
    tiktok: String,
    linkedin: String,
  },
  website: String,
  whatsappLink: String,

  // ========== Platform Data ==========
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  jobsCompleted: { type: Number, default: 0 },
  dateRegistered: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },

  // ========== Category-Specific Extensions ==========
  details: {
    // VENUE & ACCOMMODATION
    venueType: String,
    capacity: Number,
    availableRooms: Number,
    roomTypes: [{ name: String, price: Number }],
    amenities: [String],
    hallLayouts: [String],

    // FOOD & BEVERAGE
    cuisineTypes: [String],
    menuList: [String],
    menuFile: String,
    cateringCapacity: Number,
    tasteTesting: Boolean,
    onsiteCooking: Boolean,
    alcoholService: Boolean,

    // ENTERTAINMENT & HOSTING
    entertainerType: String,
    duration: Number,
    equipmentProvided: [String],
    addOns: [String],

    // DECOR & AMBIENCE
    styles: [String],
    materials: [String],
    themeCustomization: Boolean,
    setupDuration: String,
    colorPaletteGallery: [String],

    // GUEST EXPERIENCE
    servicesOffered: [String],
    dressCode: String,
    languages: [String],
    staffCount: Number,

    // SECURITY & LOGISTICS
    securityStaff: Number,
    securityType: [String],
    vehicleControl: Boolean,
    logisticsCapacity: Number,
    deliveryOptions: [String],

    // MEDIA & DOCUMENTATION
    mediaType: String,
    equipment: [String],
    deliveryFormat: [String],
    photographersPerEvent: Number,
    turnaroundTime: String,

    // FASHION & BEAUTY
    fashionCategory: String,
    customDesigns: Boolean,
    homeService: Boolean,
    productGallery: [String],
    genderFocus: { type: String, enum: ["male", "female", "unisex"] },

    // TRANSPORT & RENTALS
    vehicleTypes: [String],
    rentalDuration: String,
    chauffeurService: Boolean,
    pickupLocations: [String],
    equipmentRentals: [String],

    // PRINT & BRANDING
    serviceType: String,
    designSupport: Boolean,
    deliveryOptionsPB: [String],
    fileUploads: [String],
    minOrderQty: Number,

    // TECH & DIGITAL
    digitalServiceType: String,
    toolsUsed: [String],
    fileFormats: [String],
    revisionPolicy: String,
    deliveryTime: String,

    // HEALTH & SAFETY
    serviceTypeHS: String,
    staffPerEvent: Number,
    certification: String,
    equipmentAvailable: [String],
    emergencyContact: String,

    // TRADITIONAL ENGAGEMENT
    specialty: String,
    cultureFocus: String,
    costumeRental: Boolean,
    instrumentsProvided: [String],

    // KIDS ENTERTAINMENT
    kidsType: String,
    ageRange: String,
    supervisionStaff: Number,
    safetyProtocols: String,

    // CLEANING SERVICES
    cleaningType: String,
    equipmentProvided: [String],
    staffSize: Number,
    durationPerJob: String,
    wasteDisposal: Boolean,
  },

  // ========== Administrative Fields ==========
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  dateApproved: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("VendorProfile", VendorProfileSchema);
