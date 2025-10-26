const Notification = require("../models/notification.model");

// ✅ Get Notifications (for logged-in user)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Add Notification
const addNotification = async (req, res) => {
  try {
    const { user, sender, senderModel, message, type } = req.body;

    const newNotification = await Notification.create({
      user,
      sender,
      senderModel,
      message,
      type,
    });

    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Mark Notification as Read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  addNotification,
  markAsRead,
};
