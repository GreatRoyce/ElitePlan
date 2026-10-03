// src/routes/uploads/vendor.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../../config/multer");
const authMiddleware = require("../../middleware/authMiddleware");
const {
  uploadVendorProfileImage,
  uploadVendorGallery,
} = require("../../controllers/profiles/uploadVendor.controller");

// ✅ Upload vendor profile image
router.post(
  "/profile-image",
  authMiddleware(["vendor"]),
  upload.single("profileImage"),
  uploadVendorProfileImage
);

// ✅ Upload vendor gallery images (max 10)
router.post(
  "/gallery",
  authMiddleware(["vendor"]),
  upload.array("gallery", 10),
  uploadVendorGallery
);

module.exports = router;
