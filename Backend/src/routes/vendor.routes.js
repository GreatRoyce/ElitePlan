const express = require("express");
const { registerUser } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ======================
// ✅ Vendor Registration
// ======================
router.post(
  "/vendor/register",
  (req, res, next) => {
    req.body.role = "vendor"; // force role to vendor
    next();
  },
  registerUser
);

// ======================
// ✅ Vendor Dashboard (Protected)
// ======================
router.get("/vendor/dashboard", authMiddleware(["vendor"]), (req, res) => {
  res.json({ message: "Welcome to the Vendor Dashboard", user: req.user });
});

module.exports = router;
