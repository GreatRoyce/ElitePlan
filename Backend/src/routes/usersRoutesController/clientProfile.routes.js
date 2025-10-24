const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");
const {
  createClientProfile,
  getClientProfiles,
  getClientProfile, // ✅ newly added import
  updateClientProfile,
  deleteClientProfile,
} = require("../../controllers/usersProfileController/clientProfile.controller");

// =======================
// 🧍 Client Profile Routes
// =======================

// Create profile (only logged-in users)
router.post(
  "/create",
  authMiddleware(["client", "vendor", "planner"]),
  upload.single("imageCover"),
  createClientProfile
);

// Get all profiles (admin only)
router.get("/all", authMiddleware(["admin"]), getClientProfiles);

// ✅ Get logged-in user's profile
router.get(
  "/",
  authMiddleware(["client"]),
  getClientProfile
);

// Update profile (must be logged-in user)
router.put(
  "/update/:id",
  authMiddleware(["client"]),
  upload.single("imageCover"),
  updateClientProfile
);

// Delete profile (must be logged-in user)
router.delete(
  "/delete/:id",
  authMiddleware(["client"]),
  deleteClientProfile
);

module.exports = router;
