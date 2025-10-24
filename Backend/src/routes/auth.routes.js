const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// 🧍 Register (client, vendor, planner)
router.post("/register", registerUser);

// 🔑 Login
router.post("/login", loginUser);

// 👤 Get Current Authenticated User
router.get("/me", authMiddleware(), getMe);

module.exports = router;
