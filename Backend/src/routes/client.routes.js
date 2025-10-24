const express = require("express");
const { registerUser } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Client registration
router.post(
  "/client/register",
  (req, res, next) => {
    req.body.role = "client"; // force role before hitting controller
    next();
  },
  registerUser
);

// ✅ Client dashboard (protected)
router.get("/client/dashboard", authMiddleware(["client"]), (req, res) => {
  res.json({ message: "Welcome to the Client Dashboard", user: req.user });
});

module.exports = router;
