const PlannerProfile = require("../../models/plannerProfile.model");
const User = require("../../models/user.model");
const { publicOwnerMatch } = require("../../services/staffAccess.service");
const verification = require("../../services/profileVerification.service");
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    let profile = await PlannerProfile.findOne({ userId }).select(verification.ownerProjection);

    // 🧱 Auto-create minimal profile if none exists
    if (!profile) {
      profile = new PlannerProfile({
        userId,
        fullName: user.username || "N/A",
        email: user.email,
        phonePrimary: user.phone || "N/A",
        companyName: "N/A",
        tagline: "", // ✅ added tagline
        specialization: [],
        gallery: [],
        socialLinks: {},
      });

      await profile.save();
    }

    return res.status(200).json({
      success: true,
      data: verification.publicProfile(profile, true),
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

    let profile = await PlannerProfile.findOne({ userId }).select(verification.ownerProjection);
    if (!profile) return createOrGetPlannerProfile(req, res);

    const updates = verification.ownerUpdates(req.body, "planner");
    if (!updates || !Object.keys(updates).length && !Object.values(req.files || {}).some((files) => files.length)) return res.status(400).json({ success: false, message: "Provide editable profile fields." });

    // ✅ Validate tagline length
    if (updates.tagline && updates.tagline.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Tagline cannot exceed 120 characters",
      });
    }

    // 🧩 Normalize array fields
    if (Object.hasOwn(updates, "specialization")) updates.specialization = toArray(updates.specialization);

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

    updates.lastUpdated = Date.now();

    const updated = await PlannerProfile.findOneAndUpdate(
      { _id: profile._id, userId, ...verification.versionFilter(profile) },
      verification.ownerWrite(profile, updates, "planner", userId),
      { new: true, runValidators: true }
    ).select(verification.ownerProjection);
    if (!updated) return res.status(409).json({ success: false, message: "Your profile changed during this update. Reload it before saving again." });

    return res.status(200).json({
      success: true,
      message: "Planner profile updated successfully",
      data: verification.publicProfile(updated, true),
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
    let profile = await PlannerProfile.findOne({ userId }).select(verification.ownerProjection);

    if (!profile) return createOrGetPlannerProfile(req, res);

    return res.status(200).json({
      success: true,
      data: verification.publicProfile(profile, true),
    });
  } catch (err) {
    console.error("Get Current Planner Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving planner profile",
      error: err.message,
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
    const records = await PlannerProfile.find({ active: { $ne: false } })
      .populate({ path: "userId", select: "username email", match: publicOwnerMatch })
      .select("-__v");
    const planners = records.filter((profile) => profile.userId && profile.active !== false);

    return res.status(200).json({
      success: true,
      count: planners.length,
      data: planners.map((profile) => verification.publicProfile(profile)),
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
      .populate({ path: "userId", select: "username email", match: publicOwnerMatch })
      .populate("reviews.reviewerId", "username");

    if (!planner?.userId || planner.active === false)
      return res.status(404).json({
        success: false,
        message: "Planner profile not found",
      });

    return res.status(200).json({ success: true, data: verification.publicProfile(planner) });
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

    const profile = await PlannerProfile.findOne({ userId }).select(verification.ownerProjection);
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });

    if (profile.active === false) return res.status(409).json({ success: false, message: "A hidden listing must be reviewed by staff before it can be deleted. You can still edit its content." });
    const deleted = await PlannerProfile.findOneAndDelete({ _id: profile._id, userId, active: { $ne: false }, ...verification.versionFilter(profile) });
    if (!deleted) return res.status(409).json({ success: false, message: "The profile has changed. Refresh before deleting it." });

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
    const records = await PlannerProfile.find({
      active: { $ne: false },
      specialization: { $regex: new RegExp(specialization, "i") },
    })
      .populate({ path: "userId", select: "username email", match: publicOwnerMatch })
      .select("-__v");
    const planners = records.filter((profile) => profile.userId && profile.active !== false);

    if (!planners.length)
      return res.status(404).json({
        success: false,
        message: "No planners found for this specialization",
      });

    return res.status(200).json({
      success: true,
      count: planners.length,
      data: planners.map((profile) => verification.publicProfile(profile)),
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
