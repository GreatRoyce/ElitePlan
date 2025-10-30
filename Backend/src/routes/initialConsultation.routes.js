// routes/initialConsultation.routes.js
const express = require("express");
const router = express.Router();

const {
  createConsultation,
  getMyConsultations,
  updateConsultationStatus,
  deleteConsultation,
} = require("../controllers/initialConsultation.controller");

const authMiddleware = require("../middleware/authMiddleware");

// ✅ Must INVOKE the middleware factory
router.use(authMiddleware());

router.post("/", createConsultation);
router.get("/mine", getMyConsultations);
router.patch("/:id/status", updateConsultationStatus);
router.delete("/:id", deleteConsultation);

module.exports = router;
