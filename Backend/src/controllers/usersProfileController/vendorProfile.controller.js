const VendorProfile = require("../../models/vendorProfile.model");
const User = require("../../models/user.model");

// Helpers
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);
const normalizePath = (filePath) => filePath?.replace(/\\/g, "/");

// ===================================================
// CREATE OR GET VENDOR PROFILE
// ===================================================
const createOrGetVendorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let profile = await VendorProfile.findOne({ userId });

    if (!profile) {
      profile = new VendorProfile({
        userId,
        businessName: "N/A",
        contactPerson: user.username || "N/A",
        email: user.email,
        phonePrimary: user.phone || "N/A",
        category: "Venue & Accommodation",
        subcategory: [],
        description: "",
        gallery: [],
        portfolioImages: [],
        socialLinks: {},
      });
      await profile.save();
    }

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error("Error creating/getting vendor profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================================================
// UPDATE VENDOR PROFILE
// ===================================================
const updateVendorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    let profile = await VendorProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    const updates = { ...req.body };

    if (updates.subcategory) updates.subcategory = toArray(updates.subcategory);

    const allowedCategories = [
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
    ];

    if (updates.category && !allowedCategories.includes(updates.category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    // File uploads
    if (req.files) {
      if (req.files.gallery) updates.gallery = req.files.gallery.map((f) => normalizePath(f.path));
      if (req.files.profileImage) updates.profileImage = normalizePath(req.files.profileImage[0].path);
      if (req.files.portfolioImages) updates.portfolioImages = req.files.portfolioImages.map((f) => normalizePath(f.path));
      if (req.files.introVideo) updates.introVideo = normalizePath(req.files.introVideo[0].path);
    }

    if (updates.socialLinks) updates.socialLinks = { ...profile.socialLinks, ...updates.socialLinks };

    updates.lastUpdated = Date.now();

    const updatedProfile = await VendorProfile.findByIdAndUpdate(profile._id, updates, { new: true, runValidators: true });

    res.status(200).json({ success: true, message: "Profile updated", data: updatedProfile });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================================================
// GET CURRENT VENDOR PROFILE
// ===================================================
const getCurrentVendorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    let profile = await VendorProfile.findOne({ userId });
    if (!profile) return createOrGetVendorProfile(req, res);

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================================================
// DELETE VENDOR PROFILE
// ===================================================
const deleteVendorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const profile = await VendorProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: "Vendor profile not found" });

    await VendorProfile.findByIdAndDelete(profile._id);

    res.status(200).json({ success: true, message: "Vendor profile deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================================================
// PUBLIC VENDOR ROUTES
// ===================================================
const getVendorProfiles = async (req, res) => {
  try {
    const vendors = await VendorProfile.find().populate("userId", "username email").select("-__v");
    res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVendorProfileById = async (req, res) => {
  try {
    const vendor = await VendorProfile.findById(req.params.id).populate("userId", "username email");
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVendorsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const vendors = await VendorProfile.find({ category }).populate("userId", "username email");
    if (!vendors.length) return res.status(404).json({ success: false, message: "No vendors found" });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrGetVendorProfile,
  updateVendorProfile,
  getCurrentVendorProfile,
  deleteVendorProfile,
  getVendorProfiles,
  getVendorProfileById,
  getVendorsByCategory,
};
