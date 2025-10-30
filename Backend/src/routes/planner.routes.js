const express = require("express");
const router = express.Router();

const {
  getNotifications,
  addNotification,
  markAsRead,
} = require("../controllers/notification.controller");

const authMiddleware = require("../middleware/authMiddleware");

// ✅ Protect all routes with auth middleware
router.use(authMiddleware);

// ✅ Route definitions
router.get("/", getNotifications);       // Get all notifications for the logged-in user
router.post("/", addNotification);       // Create a new notification
router.patch("/:id/read", markAsRead);   // Mark specific notification as read

module.exports = router;
