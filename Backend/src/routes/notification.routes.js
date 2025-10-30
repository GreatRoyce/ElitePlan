const express = require("express");
const router = express.Router();

const {
  getNotifications,
  addNotification,
  markAsRead,
} = require("../controllers/notification.controller");

const authMiddleware = require("../middleware/authMiddleware");

// ✅ Always INVOKE middleware factory
router.use(authMiddleware());

// ✅ Route definitions
router.get("/", getNotifications);             // Get current user’s notifications
router.post("/", addNotification);             // Add a notification
router.patch("/:id/read", markAsRead);         // Mark one as read

module.exports = router;
