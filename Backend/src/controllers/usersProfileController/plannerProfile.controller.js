const PlannerProfile = require("../../models/plannerProfile.model");
const User = require("../../models/user.model");
const path = require("path");

// 🔧 Helper: Normalize to array
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

// 🔧 Helper: Normalize file path for all OS
const normalizePath = (filePath) => filePath?.replace(/\\/g, "/");

// ===================================================
// 🎯 CREATE OR GET EMPTY PLANNER PROFILE (Auto-Creates)
// ===================================================
const createOrGetPlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    let profile = await PlannerProfile.findOne({ userId });

    // 🧱 Auto-create minimal profile if none exists
    if (!profile) {
      profile = new PlannerProfile({
        userId,
        fullName: user.username || "N/A",
        email: user.email,
        phonePrimary: user.phone || "N/A",
        companyName: "N/A",
        specialization: [],
        gallery: [],
        socialLinks: {},
      });

      await profile.save();
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    console.error("Error creating/getting planner profile:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating/fetching profile",
      error: err.message,
    });
  }
};

// ===================================================
// ✏️ UPDATE PLANNER PROFILE (Planner Only)
// ===================================================
const updatePlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    let profile = await PlannerProfile.findOne({ userId });
    if (!profile) return createOrGetPlannerProfile(req, res);

    const updates = { ...req.body };

    // 🧩 Normalize array fields
    updates.specialization = toArray(updates.specialization);

    // 🖼 Handle image uploads
    if (req.files) {
      if (req.files.gallery) {
        updates.gallery = req.files.gallery.map((f) => normalizePath(f.path));
      }
      if (req.files.profileImage) {
        updates.profileImage = normalizePath(req.files.profileImage[0].path);
      }
    }

    // 🌐 Merge social links (avoid overwriting missing keys)
    if (updates.socialLinks) {
      updates.socialLinks = {
        ...profile.socialLinks,
        ...updates.socialLinks,
      };
    }

    // 🧱 Update profile
    const updated = await PlannerProfile.findByIdAndUpdate(
      profile._id,
      { ...updates, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Planner profile updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Planner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating planner profile",
      error: error.message,
    });
  }
};

// ===================================================
// 👤 GET CURRENT LOGGED-IN PLANNER PROFILE
// ===================================================
const getCurrentPlannerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    let profile = await PlannerProfile.findOne({ userId });

    if (!profile) return createOrGetPlannerProfile(req, res);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    console.error("Get Current Planner Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving planner profile",
    });
  }
};

// ===================================================
// 📸 UPLOAD PROFILE IMAGE
// ===================================================
const uploadPlannerProfileImage = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded" });

    const filePath = normalizePath(req.file.path);
    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: { profileImage: filePath },
    });
  } catch (error) {
    console.error("Upload Planner Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading profile image",
      error: error.message,
    });
  }
};

// ===================================================
// 🖼 UPLOAD GALLERY IMAGES
// ===================================================
const uploadPlannerGallery = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No gallery images uploaded" });

    const galleryPaths = req.files.map((f) => normalizePath(f.path));

    return res.status(200).json({
      success: true,
      message: "Gallery images uploaded successfully",
      data: { gallery: galleryPaths },
    });
  } catch (error) {
    console.error("Upload Gallery Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading gallery images",
      error: error.message,
    });
  }
};

// ===================================================
// 🌍 PUBLIC: GET ALL PLANNERS
// ===================================================
const getPlannerProfiles = async (req, res) => {
  try {
    const planners = await PlannerProfile.find()
      .populate("userId", "username email")
      .select("-__v");

    return res.status(200).json({
      success: true,
      count: planners.length,
      data: planners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch planner profiles",
      error: error.message,
    });
  }
};

// ===================================================
// 🌍 PUBLIC: GET SINGLE PLANNER PROFILE BY ID
// ===================================================
const getPlannerProfileById = async (req, res) => {
  try {
    const planner = await PlannerProfile.findById(req.params.id)
      .populate("userId", "username email")
      .populate("reviews.reviewerId", "username");

    if (!planner)
      return res.status(404).json({
        success: false,
        message: "Planner profile not found",
      });

    return res.status(200).json({ success: true, data: planner });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch planner profile",
      error: error.message,
    });
  }
};

// ===================================================
// ❌ DELETE OWN PROFILE
// ===================================================
const deletePlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const profile = await PlannerProfile.findOne({ userId });
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });

    await PlannerProfile.findByIdAndDelete(profile._id);

    return res.status(200).json({
      success: true,
      message: "Planner profile deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting planner profile",
      error: error.message,
    });
  }
};

// ===================================================
// 🎯 PUBLIC: FILTER PLANNERS BY SPECIALIZATION
// ===================================================
const getPlannersBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;
    const planners = await PlannerProfile.find({
      specialization: { $regex: new RegExp(specialization, "i") },
    })
      .populate("userId", "username email")
      .select("-__v");

    if (!planners.length)
      return res.status(404).json({
        success: false,
        message: "No planners found for this specialization",
      });

    return res.status(200).json({
      success: true,
      count: planners.length,
      data: planners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch planners by specialization",
      error: error.message,
    });
  }
};

module.exports = {
  createOrGetPlannerProfile,
  updatePlannerProfile,
  getCurrentPlannerProfile,
  uploadPlannerProfileImage,
  uploadPlannerGallery,
  getPlannerProfiles,
  getPlannerProfileById,
  deletePlannerProfile,
  getPlannersBySpecialization,
};
