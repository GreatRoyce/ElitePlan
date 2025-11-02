// routes/notification.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notification.controller");

router.use(authMiddleware());

router.post("/", createNotification);
router.get("/mine", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
