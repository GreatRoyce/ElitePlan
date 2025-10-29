// src/routes/usersRoutesController/uploadVendor.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");
const {
  uploadVendorProfileImage,
  uploadVendorGallery,
} = require("../../controllers/usersProfileController/uploadVendor.controller");

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
