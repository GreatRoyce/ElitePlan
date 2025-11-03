const Notification = require("../models/notification.model");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const ClientProfile = require("../models/clientProfile.model");

// ========================================
// 🧩 Helper: Auto-detect all possible user profiles
// ========================================
const getUserProfileData = async (user) => {
  const possibleIds = [user._id];
  const possibleModels = ["User"];

  const profiles = [
    { model: PlannerProfile, name: "PlannerProfile" },
    { model: VendorProfile, name: "VendorProfile" },
    { model: ClientProfile, name: "ClientProfile" },
  ];

  for (const { model, name } of profiles) {
    const profile = await model
      .findOne({ $or: [{ user: user._id }, { userId: user._id }] })
      .select("_id")
      .lean();

    if (profile) {
      possibleIds.push(profile._id);
      possibleModels.push(name);
    }
  }

  return { possibleIds, possibleModels };
};

// ========================================
// 📨 Get My Notifications
// ========================================
const getMyNotifications = async (req, res) => {
  try {
    const { possibleIds, possibleModels } = await getUserProfileData(req.user);

    const query = {
      $or: [
        { user: { $in: possibleIds } },
        {
          $and: [
            { userModel: { $in: possibleModels } },
            { user: { $in: possibleIds } },
          ],
        },
      ],
    };

    const notifications = await Notification.find(query)
      .select("_id sender message type isRead createdAt imageCover") // <-- include imageCover
      .populate("sender", "fullName businessName imageCover email") // sender imageCover
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedNotifications = notifications.map((n) => ({
      ...n,
      sender: n.sender || null,
    }));

    res.status(200).json({
      success: true,
      count: sanitizedNotifications.length,
      notifications: sanitizedNotifications,
    });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// ✅ Mark One Notification as Read
// ========================================
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// 🔁 Mark All as Read
// ========================================
const markAllAsRead = async (req, res) => {
  try {
    const { possibleIds } = await getUserProfileData(req.user);

    const result = await Notification.updateMany(
      { user: { $in: possibleIds }, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (err) {
    console.error("❌ Error marking all as read:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// 🔁 Mark as Unread
// ========================================
const markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    notification.isRead = false;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as unread",
      notification,
    });
  } catch (err) {
    console.error("❌ Error marking notification as unread:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// ❌ Delete One Notification
// ========================================
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    res
      .status(200)
      .json({ success: true, message: "Notification deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting notification:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// 🗑️ Delete All Read Notifications
// ========================================
const deleteAllRead = async (req, res) => {
  try {
    const { possibleIds } = await getUserProfileData(req.user);

    const result = await Notification.deleteMany({
      user: { $in: possibleIds },
      isRead: true,
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`,
    });
  } catch (err) {
    console.error("❌ Error deleting read notifications:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// 🧹 Delete All Notifications
// ========================================
const clearAllNotifications = async (req, res) => {
  try {
    const { possibleIds } = await getUserProfileData(req.user);

    const result = await Notification.deleteMany({ user: { $in: possibleIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notifications cleared`,
    });
  } catch (err) {
    console.error("❌ Error clearing notifications:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// 📤 Export
// ========================================
module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  deleteAllRead,
  clearAllNotifications,
};
