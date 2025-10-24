const express = require("express");
const { registerUser } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Vendor registration
router.post(
  "/planner/register",
  (req, res, next) => {
    req.body.role = "vendor";
    next();
  },
  registerUser
);

// ✅ Vendor dashboard (protected)
router.get("/planner/dashboard", authMiddleware(["vendor"]), (req, res) => {
  res.json({ message: "Welcome to the Planner Dashboard", user: req.user });
});

module.exports = router;
