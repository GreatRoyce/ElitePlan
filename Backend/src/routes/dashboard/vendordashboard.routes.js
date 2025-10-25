// src/routes/dashboard/vendordashboard.routes.js
const express = require("express");
const router = express.Router();

// ✅ import controllers correctly
const {
  getVendorDashboard,
  updateOrderStatus,
  addPayment,
  addNotification,
  addRating,
} = require("../../controllers/dashboard/vendordashboard.controller");

// ✅ middleware (if you use one)
const authMiddleware = require("../../middleware/authMiddleware");
// comment this out if you don’t have it yet

// -------------------- ROUTES --------------------

router.use(authMiddleware(["vendor"]));


// Fetch vendor dashboard
router.get("/", getVendorDashboard);

// Update order status
router.patch("/orders/:orderId",  updateOrderStatus);

// Add payment
router.post("/orders/:orderId/payment",  addPayment);

// Add notification
router.post("/notifications",  addNotification);

// Add rating
router.post("/ratings", addRating);

module.exports = router;
