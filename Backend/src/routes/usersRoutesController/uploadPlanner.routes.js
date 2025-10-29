// src/routes/usersProfileRoutes/uploadPlanner.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");
const {
  uploadPlannerProfileImage,
  uploadPlannerGallery,
} = require("../../controllers/usersProfileController/uploadPlanner.controller");

// ✅ Upload planner profile image
router.post(
  "/profile-image",
  authMiddleware(["planner"]),
  upload.single("profileImage"),
  uploadPlannerProfileImage
);

// ✅ Upload planner gallery images (max 10)
router.post(
  "/gallery",
  authMiddleware(["planner"]),
  upload.array("gallery", 10),
  uploadPlannerGallery
);

module.exports = router;
