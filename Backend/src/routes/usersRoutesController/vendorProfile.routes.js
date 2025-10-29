const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");

const {
  createOrGetVendorProfile,
  updateVendorProfile,
  getCurrentVendorProfile,
  deleteVendorProfile,
  getVendorProfiles,
  getVendorProfileById,
  getVendorsByCategory,
} = require("../../controllers/usersProfileController/vendorProfile.controller");

// VENDOR AUTH ROUTES
router.get("/me", authMiddleware(["vendor"]), getCurrentVendorProfile);
router.put(
  "/update/me",
  authMiddleware(["vendor"]),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "portfolioImages", maxCount: 5 },
    { name: "gallery", maxCount: 5 },
    { name: "introVideo", maxCount: 1 },
  ]),
  updateVendorProfile
);
router.delete("/delete/me", authMiddleware(["vendor"]), deleteVendorProfile);

// PUBLIC ROUTES
router.get("/all", getVendorProfiles);
router.get("/category/:category", getVendorsByCategory);
router.get("/:id", getVendorProfileById);

module.exports = router;
