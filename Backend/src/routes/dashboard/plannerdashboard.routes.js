const express = require("express");
const router = express.Router();

// ✅ Import all controller methods
const {
  getDashboard,
  updateEventStatus,
  recruitVendor,
  addPaymentController,
  addNotification,
  addRating,
  getPlannerConversations, // Fetch conversations
  sendPlannerMessage,      // Send messages
} = require("../../controllers/dashboard/plannerdashboard.controller");

const authMiddleware = require("../../middleware/authMiddleware");

// 🛡️ Protect all routes — only authenticated planners
router.use(authMiddleware(["planner"]));

// 📊 Dashboard
router.get("/", getDashboard);

// ✏️ Update event status
router.patch("/events/:eventId", updateEventStatus);

// 💰 Add payment to event
router.post("/events/:eventId/payments", addPaymentController);

// ⭐ Add rating
router.post("/ratings", addRating);

// 🔔 Add notification
router.post("/notifications", addNotification);

// 🤝 Recruit vendor
router.post("/events/recruit-vendor", recruitVendor);

// 💬 Messaging
router.get("/conversations", getPlannerConversations);
router.post("/messages", sendPlannerMessage);

module.exports = router;
