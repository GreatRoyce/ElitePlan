const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { recordVisit } = require("./analytics.controller");

const router = express.Router();
router.post("/visits", rateLimit({
  windowMs: 60000,
  limit: 240,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many visit requests. Please try again later." },
}), express.json({ limit: "2kb" }), recordVisit);

module.exports = router;
