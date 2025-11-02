const Notification = require("../models/notification.model");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const ClientProfile = require("../models/clientProfile.model");

// ===================================================
// Helper: Get profile model based on userModel
// ===================================================
const getProfileModel = (userModel) => {
  switch (userModel) {
    case "PlannerProfile":
      return PlannerProfile;
    case "VendorProfile":
      return VendorProfile;
    case "ClientProfile":
      return ClientProfile;
    default:
      return null;
  }
};

// ===================================================
// CREATE Notification
// ===================================================
const createNotification = async (req, res) => {
  try {
    const { user, userModel, sender, senderModel, message, type } = req.body;

    if (!user || !userModel || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const notification = await Notification.create({
      user,
      userModel,
      sender,
      senderModel,
      message,
      type,
    });

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===================================================
// GET My Notifications
// ===================================================
const getNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing authentication data",
      });
    }

    const notifications = await Notification.find({
      user: userId, // Query by the main User ID
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(); // Use lean for better performance as we are not modifying docs here

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===================================================
// MARK Notification as Read
// ===================================================
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===================================================
// DELETE Notification
// ===================================================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===================================================
// MARK ALL Notifications as Read
// ===================================================
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res
      .status(200)
      .json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===================================================
// EXPORTS (modules at the bottom)
// ===================================================
module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
