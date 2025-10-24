const VendorProfile = require("../../models/vendorProfile.model");
const User = require("../../models/user.model");

// ================== CREATE VENDOR PROFILE ==================
const createVendorProfile = async (req, res) => {
  try {
    const {
      businessName,
      contactPerson,
      alternateContact,
      category,
      subcategory,
      description,
      yearsExperience,
      address,
      city,
      state,
      country,
      operatingHours,
      priceRange,
      paymentMethods,
      socialLinks,
      website,
      whatsappLink,
      details,
    } = req.body;

    // ✅ Logged-in user from token
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // ✅ Images
    const profileImage =
      req.files?.profileImage?.[0]?.path.replace(/\\/g, "/") || null;
    const portfolioImages = req.files?.portfolioImages
      ? req.files.portfolioImages.map((file) => file.path.replace(/\\/g, "/"))
      : [];
    const gallery = req.files?.gallery
      ? req.files.gallery.map((file) => file.path.replace(/\\/g, "/"))
      : [];

    const newVendor = new VendorProfile({
      userId,
      businessName,
      contactPerson,
      email: user.email,
      phonePrimary: user.phone,
      alternateContact,
      profileImage,
      portfolioImages,
      gallery,
      category,
      subcategory,
      description,
      yearsExperience,
      address,
      city,
      state,
      country,
      operatingHours,
      priceRange,
      paymentMethods,
      socialLinks,
      website,
      whatsappLink,
      details,
    });

    await newVendor.save();

    res.status(201).json({
      success: true,
      message: "Vendor profile created successfully",
      data: newVendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create vendor profile",
      error: error.message,
    });
  }
};

// ================== GET ALL VENDOR PROFILES ==================
const getAllVendors = async (req, res) => {
  try {
    const vendors = await VendorProfile.find()
      .populate("userId", "username email")
      .select("-__v");

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve vendors",
      error: error.message,
    });
  }
};

// ================== GET SINGLE VENDOR BY ID ==================
const getVendorById = async (req, res) => {
  try {
    const vendor = await VendorProfile.findById(req.params.id)
      .populate("userId", "username email")
      .populate("reviews");

    if (!vendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve vendor",
      error: error.message,
    });
  }
};

// ================== UPDATE VENDOR PROFILE ==================
const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const updates = req.body;

    if (req.files?.profileImage) {
      updates.profileImage = req.files.profileImage[0].path.replace(/\\/g, "/");
    }
    if (req.files?.portfolioImages) {
      updates.portfolioImages = req.files.portfolioImages.map((file) =>
        file.path.replace(/\\/g, "/")
      );
    }
    if (req.files?.gallery) {
      updates.gallery = req.files.gallery.map((file) =>
        file.path.replace(/\\/g, "/")
      );
    }

    const updatedVendor = await VendorProfile.findByIdAndUpdate(
      vendorId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedVendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    res.status(200).json({
      success: true,
      message: "Vendor profile updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update vendor profile",
      error: error.message,
    });
  }
};

// ================== DELETE VENDOR PROFILE ==================
const deleteVendorProfile = async (req, res) => {
  try {
    const vendor = await VendorProfile.findByIdAndDelete(req.params.id);
    if (!vendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete vendor",
      error: error.message,
    });
  }
};

// ================== FILTER BY CATEGORY ==================
const getVendorsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const vendors = await VendorProfile.find({ category }).populate(
      "userId",
      "username email"
    );

    if (!vendors.length)
      return res.status(404).json({
        success: false,
        message: "No vendors found in this category",
      });

    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch category vendors",
      error: error.message,
    });
  }
};

// ================== VERIFY OR FEATURE A VENDOR ==================
const verifyVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, featured, approvedBy } = req.body;

    const vendor = await VendorProfile.findByIdAndUpdate(
      id,
      { verified, featured, approvedBy, dateApproved: Date.now() },
      { new: true }
    );

    if (!vendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    res.status(200).json({
      success: true,
      message: "Vendor status updated successfully",
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update vendor status",
      error: error.message,
    });
  }
};

module.exports = {
  createVendorProfile,
  getAllVendors,
  getVendorById,
  updateVendorProfile,
  deleteVendorProfile,
  getVendorsByCategory,
  verifyVendor,
};
