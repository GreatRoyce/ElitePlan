const express = require("express");
const router = express.Router();

// ✅ Import all controller methods correctly
const {
  getDashboard,
  updateEventStatus,
  addPaymentController,
  addNotification,
  addRating,
} = require("../../controllers/dashboard/plannerdashboard.controller");

const authMiddleware = require("../../middleware/authMiddleware");

// 🛡️ Protect all routes — only authenticated planners can access
router.use(authMiddleware(["planner"]));

// 📊 Dashboard routes
router.get("/", getDashboard); // Fetch dashboard

// ✏️ Update event status
router.patch("/events/:eventId", updateEventStatus);

// 💰 Add payment to event
router.post("/events/:eventId/payments", addPaymentController);
router.post("/ratings", addRating);

// 🔔 Add notification
router.post("/notifications", addNotification);

module.exports = router;
