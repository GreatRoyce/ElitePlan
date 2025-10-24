const PlannerProfile = require("../../models/plannerProfile.model");
const User = require("../../models/user.model");

// ===============================
// 🎯 CREATE PLANNER PROFILE
// ===============================
const createPlannerProfile = async (req, res) => {
  try {
    const {
      companyName,
      specialization,
      yearsExperience,
      shortBio,
      state,
      country,
      eventTypesHandled,
      ongoingProjects,
      languagesSpoken,
      serviceRegions,
      certifications,
      preferredVendorCategories,
      plannerType,
      socialLinks,
    } = req.body;

    // ✅ Authenticated user
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - no user ID found" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // ✅ Prevent duplicate planner profiles
    const existing = await PlannerProfile.findOne({ userId });
    if (existing)
      return res.status(400).json({
        success: false,
        message: "You already have a planner profile.",
      });

    // ✅ Handle file uploads
    const profileImage =
      req.files?.profileImage?.[0]?.path.replace(/\\/g, "/") || null;
    const gallery = req.files?.gallery
      ? req.files.gallery.map((file) => file.path.replace(/\\/g, "/"))
      : [];

    // ✅ Create profile
    const newProfile = new PlannerProfile({
      userId,
      fullName: user.username,
      email: user.email,
      phonePrimary: user.phone || "N/A",
      companyName,
      specialization: Array.isArray(specialization)
        ? specialization
        : [specialization],
      yearsExperience,
      shortBio,
      state,
      country,
      eventTypesHandled,
      ongoingProjects,
      languagesSpoken,
      serviceRegions,
      certifications,
      preferredVendorCategories,
      plannerType,
      socialLinks,
      profileImage,
      gallery,
    });

    await newProfile.save();

    res.status(201).json({
      success: true,
      message: "Planner profile created successfully",
      data: newProfile,
    });
  } catch (error) {
    console.error("Create Planner Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating planner profile",
      error: error.message,
    });
  }
};

// ===============================
// 📋 GET ALL PLANNER PROFILES (PUBLIC)
// ===============================
const getPlannerProfiles = async (req, res) => {
  try {
    const planners = await PlannerProfile.find()
      .populate("userId", "username email")
      .select("-__v");

    res.status(200).json({
      success: true,
      count: planners.length,
      data: planners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve planners",
      error: error.message,
    });
  }
};

// ===============================
// 🔍 GET SINGLE PLANNER BY ID (PUBLIC)
// ===============================
const getPlannerProfileById = async (req, res) => {
  try {
    const planner = await PlannerProfile.findById(req.params.id)
      .populate("userId", "username email")
      .populate("reviews.reviewerId", "username");

    if (!planner)
      return res
        .status(404)
        .json({ success: false, message: "Planner profile not found" });

    res.status(200).json({ success: true, data: planner });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch planner profile",
      error: error.message,
    });
  }
};

// ===============================
// ✏️ UPDATE PLANNER PROFILE (PLANNER OR ADMIN)
// ===============================
const updatePlannerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const profile = await PlannerProfile.findById(id);
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Planner profile not found" });

    // Restrict access
    if (profile.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only update your own profile",
      });
    }

    const updates = req.body;

    // ✅ Handle media updates
    if (req.files?.profileImage) {
      updates.profileImage = req.files.profileImage[0].path.replace(/\\/g, "/");
    }
    if (req.files?.gallery) {
      updates.gallery = req.files.gallery.map((file) =>
        file.path.replace(/\\/g, "/")
      );
    }

    const updated = await PlannerProfile.findByIdAndUpdate(
      id,
      { ...updates, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Planner profile updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating planner profile",
      error: error.message,
    });
  }
};

// ===============================
// ❌ DELETE PLANNER PROFILE (PLANNER OR ADMIN)
// ===============================
const deletePlannerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const profile = await PlannerProfile.findById(id);
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Planner profile not found" });

    if (profile.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only delete your own profile",
      });
    }

    await PlannerProfile.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Planner profile deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting planner profile",
      error: error.message,
    });
  }
};

// ===============================
// 📂 FILTER BY SPECIALIZATION (PUBLIC)
// ===============================
const getPlannersBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;

    // Case-insensitive search for the specialization within the array
    const planners = await PlannerProfile.find({
      specialization: { $regex: new RegExp(specialization, "i") },
    })
      .populate("userId", "username email")
      .select("-__v");

    if (!planners.length) {
      return res.status(404).json({
        success: false,
        message: "No planners found with this specialization",
      });
    }

    res
      .status(200)
      .json({ success: true, count: planners.length, data: planners });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch planners by specialization",
      error: error.message,
    });
  }
};

module.exports = {
  createPlannerProfile,
  getPlannerProfiles,
  getPlannerProfileById,
  updatePlannerProfile,
  deletePlannerProfile,
  getPlannersBySpecialization,
};
