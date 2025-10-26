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
router.get("/", getNotifications);
router.post("/", addNotification);
router.patch("/:id/read", markAsRead);

module.exports = router;
