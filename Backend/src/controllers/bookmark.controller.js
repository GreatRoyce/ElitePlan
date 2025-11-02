// controllers/bookmark.controller.js
const mongoose = require("mongoose");
const Bookmark = require("../models/bookmark.model");
const VendorProfile = require("../models/vendorProfile.model"); // adjust path/name if different
const PlannerProfile = require("../models/plannerProfile.model"); // adjust path/name if different

// Create a bookmark
const createBookmark = async (req, res) => {
  try {
    const clientId = req.user?._id || req.user?.id;
    // normalize possible keys
    const rawTargetId = req.body.targetId || req.body.target;
    const targetId = rawTargetId && String(rawTargetId).trim();
    let { targetModel } = req.body;

    if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // normalize model string capitalization if provided
    if (typeof targetModel === "string") {
      targetModel = targetModel === targetModel.toLowerCase()
        ? targetModel.charAt(0).toUpperCase() + targetModel.slice(1)
        : targetModel;
    }

    // Accept only the two allowed models
    const allowed = ["VendorProfile", "PlannerProfile"];
    if (!targetId || !targetModel || !allowed.includes(targetModel)) {
      return res.status(400).json({ success: false, message: "targetId and valid targetModel are required." });
    }

    // validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: "Invalid targetId" });
    }

    // ensure target exists in respective collection
    const targetModelMap = {
      VendorProfile: VendorProfile,
      PlannerProfile: PlannerProfile,
    };

    const Model = targetModelMap[targetModel];
    if (!Model) return res.status(400).json({ success: false, message: "Invalid targetModel" });

    const targetDoc = await Model.findById(targetId).lean();
    if (!targetDoc) {
      return res.status(404).json({ success: false, message: "Target profile not found" });
    }

    // prevent duplicate (safeguard)
    const exists = await Bookmark.findOne({ client: clientId, targetId, targetModel });
    if (exists) {
      return res.status(200).json({ success: true, message: "Already bookmarked", bookmark: exists });
    }

    const bookmark = await Bookmark.create({
      client: clientId,
      targetId,
      targetModel,
    });

    res.status(201).json({
      success: true,
      message: "Bookmark created successfully.",
      bookmark,
    });
  } catch (error) {
    console.error("❌ Error creating bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error creating bookmark.",
      error: error.message,
    });
  }
};

// Get current user's bookmarks
const getMyBookmarks = async (req, res) => {
  try {
    const clientId = req.user?._id || req.user?.id;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    const bookmarks = await Bookmark.find({ client: clientId })
      .populate({
        path: "targetId",
        select: "username name businessName category image location city state country",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookmarks.length,
      data: bookmarks,
    });
  } catch (error) {
    console.error("❌ Fetch bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookmarks.",
      error: error.message,
    });
  }
};

// Delete a bookmark by targetId (route param) OR fallback to body
const deleteBookmark = async (req, res) => {
  try {
    const clientId = req.user?._id || req.user?.id;
    const paramTargetId = req.params?.targetId;
    const bodyTargetId = req.body?.targetId || req.body?.target;
    const targetId = paramTargetId || bodyTargetId;

    if (!clientId || !targetId) {
      return res.status(400).json({
        success: false,
        message: "Client ID and targetId are required.",
      });
    }

    const deleted = await Bookmark.findOneAndDelete({
      client: clientId,
      targetId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found or already removed.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookmark removed successfully.",
    });
  } catch (error) {
    console.error("❌ Delete bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Error removing bookmark.",
      error: error.message,
    });
  }
};

module.exports = {
  createBookmark,
  getMyBookmarks,
  deleteBookmark,
};
