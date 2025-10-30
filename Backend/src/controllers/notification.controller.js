const Notification = require("../models/notification.model");

// ===================================================
// 🔔 GET USER NOTIFICATIONS
// ===================================================
const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(30); // Slightly increased for flexibility

    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ===================================================
// ➕ ADD NEW NOTIFICATION
// ===================================================
const addNotification = async (req, res) => {
  try {
    const { user, sender, senderModel, message, type } = req.body;

    if (!user || !message || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: user, message, and type are mandatory.",
      });
    }

    const newNotification = await Notification.create({
      user,
      sender,
      senderModel,
      message,
      type,
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data: newNotification,
    });
  } catch (error) {
    console.error("Add Notification Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ===================================================
// 📩 MARK NOTIFICATION AS READ
// ===================================================
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found or not yours." });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  addNotification,
  markAsRead,
};
