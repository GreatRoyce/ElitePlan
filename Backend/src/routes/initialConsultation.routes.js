// routes/initialConsultation.routes.js
const express = require("express");
const router = express.Router();

const {
  createConsultation,
  getMyConsultations,
  updateConsultationStatus,
  deleteConsultation,
  getPendingConsultations, // ✅ New controller
} = require("../controllers/initialConsultation.controller");

const authMiddleware = require("../middleware/authMiddleware");

// Apply auth middleware to all routes
router.use(authMiddleware());

// Existing routes
router.post("/", createConsultation);
router.get("/mine", getMyConsultations);
router.patch("/:id/status", updateConsultationStatus);
router.delete("/:id", deleteConsultation);

// ✅ New route for pending requests (planner/vendor)
router.get("/pending", getPendingConsultations);

module.exports = router;
