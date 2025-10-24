const Bookmark = require("../models/bookmark.model");

/**
 * 🟢 Create a new bookmark
 * POST /api/bookmarks
 */
const createBookmark = async (req, res) => {
  try {
    const clientId = req.user._id; // from token
    const { targetId, targetModel } = req.body;

    console.log("User:", req.user);
    console.log("Body:", req.body);

    // ✅ Validate required fields
    if (!targetId || !targetModel) {
      return res
        .status(400)
        .json({ message: "targetId and targetModel are required." });
    }

    // ✅ Create new bookmark document
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
    res.status(400).json({
      success: false,
      message: "Error creating bookmark.",
      error: error.message,
    });
  }
};

/**
 * 📜 Get all bookmarks for logged-in client
 * GET /api/bookmarks
 */
const getMyBookmarks = async (req, res) => {
  try {
    const clientId = req.user?._id || req.user?.id;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    // ✅ Populate the referenced profile (Vendor or Planner)
    const bookmarks = await Bookmark.find({ client: clientId })
      .populate({
        path: "targetId",
        select: "username name businessName category image location",
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

/**
 * 🗑️ Delete a bookmark
 * DELETE /api/bookmarks/:targetId
 */
const deleteBookmark = async (req, res) => {
  try {
    const clientId = req.user?._id || req.user?.id;
    const { targetId } = req.params;

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
