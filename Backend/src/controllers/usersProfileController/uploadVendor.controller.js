// src/controllers/usersProfileController/uploadVendor.controller.js
const VendorProfile = require("../../models/vendorProfile.model");

// ✅ Normalize file path for cross-platform compatibility
const normalizePath = (filePath) => filePath?.replace(/\\/g, "/");

// ===================================================
// 🖼 Upload Vendor Profile Image
// ===================================================
const uploadVendorProfileImage = async (req, res) => {
  try {
    // Ensure authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const userId = req.user.id;
    const imagePath = normalizePath(req.file.path);

    // Update vendor's profile image
    const vendor = await VendorProfile.findOneAndUpdate(
      { userId },
      { profileImage: imagePath, lastUpdated: Date.now() },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: { profileImage: imagePath, vendor },
    });
  } catch (error) {
    console.error("Upload Vendor Profile Image Error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading profile image",
      error: error.message,
    });
  }
};

// ===================================================
// 🖼 Upload Vendor Gallery Images
// ===================================================
const uploadVendorGallery = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const userId = req.user.id;
    const imagePaths = req.files.map((file) => normalizePath(file.path));

    const vendor = await VendorProfile.findOneAndUpdate(
      { userId },
      { $push: { gallery: { $each: imagePaths } }, lastUpdated: Date.now() },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Gallery images uploaded successfully",
      data: { gallery: imagePaths, vendor },
    });
  } catch (error) {
    console.error("Upload Vendor Gallery Error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading gallery images",
      error: error.message,
    });
  }
};

module.exports = {
  uploadVendorProfileImage,
  uploadVendorGallery,
};
