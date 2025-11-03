// routes/notification.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  deleteAllRead,
  clearAllNotifications,
} = require("../controllers/notification.controller");

// ========================================
// 🔒 Apply authentication to all routes
// ========================================
router.use(authMiddleware());

// ========================================
// 📬 Notifications Routes
// ========================================

// 📨 Get all my notifications
router.get("/mine", getMyNotifications);

// ✅ Mark one notification as read
router.patch("/:id/read", markNotificationAsRead);

// 🔁 Mark all notifications as read
router.patch("/mark-all-read", markAllAsRead);

// 🔁 Mark one as unread
router.patch("/:id/unread", markAsUnread);

// ❌ Delete one notification
router.delete("/:id", deleteNotification);

// 🗑️ Delete all read notifications
router.delete("/delete-read", deleteAllRead);

// 🧹 Clear all notifications
router.delete("/clear-all", clearAllNotifications);

module.exports = router;
