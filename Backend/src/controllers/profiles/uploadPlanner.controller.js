const PlannerProfile = require("../../models/plannerProfile.model");
const { publicProfile, ownerProjection } = require("../../services/profileVerification.service");

// ✅ Helper: Normalize path for all OS
const normalizePath = (filePath) => filePath?.replace(/\\/g, "/");

// ===================================================
// 🖼 Upload Planner Profile Image
// ===================================================
const uploadPlannerProfileImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const imagePath = normalizePath(req.file.path);

    const planner = await PlannerProfile.findOneAndUpdate(
      { userId },
      { $set: { profileImage: imagePath, lastUpdated: Date.now() }, $inc: { verificationVersion: 1 } },
      { new: true }
    ).select(ownerProjection);

    if (!planner)
      return res
        .status(404)
        .json({ success: false, message: "Planner profile not found" });

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: { profileImage: imagePath, planner: publicProfile(planner, true) },
    });
  } catch (error) {
    console.error("Upload Profile Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading profile image",
      error: error.message,
    });
  }
};

// ===================================================
// 🖼 Upload Planner Gallery Images
// ===================================================
const uploadPlannerGallery = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!req.files || req.files.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });

    const imagePaths = req.files.map((file) => normalizePath(file.path));

    const planner = await PlannerProfile.findOneAndUpdate(
      { userId },
      { $push: { gallery: { $each: imagePaths } }, $set: { lastUpdated: Date.now() }, $inc: { verificationVersion: 1 } },
      { new: true }
    ).select(ownerProjection);

    if (!planner)
      return res
        .status(404)
        .json({ success: false, message: "Planner profile not found" });

    return res.status(200).json({
      success: true,
      message: "Gallery images uploaded successfully",
      data: { gallery: imagePaths, planner: publicProfile(planner, true) },
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

module.exports = {
  uploadPlannerProfileImage,
  uploadPlannerGallery,
};
