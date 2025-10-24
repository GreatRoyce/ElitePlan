const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");
const {
  createVendorProfile,
  getAllVendors,
  getVendorById,
  updateVendorProfile,
  deleteVendorProfile,
  getVendorsByCategory,
  verifyVendor,
} = require("../../controllers/usersProfileController/vendorProfile.controller");

// =======================
// 🏢 Vendor Profile Routes
// =======================

// ✅ Create vendor profile (only logged-in vendors or admins)
router.post(
  "/create",
  authMiddleware(["vendor", "admin"]),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "portfolioImages", maxCount: 10 },
    { name: "gallery", maxCount: 10 },
    { name: "introVideo", maxCount: 1 },
  ]),
  createVendorProfile
);

// ✅ Get all vendor profiles (public)
router.get("/all", getAllVendors);

// ✅ Filter vendors by category (public)
router.get("/category/:category", getVendorsByCategory);

// ✅ Update vendor profile (vendor or admin)
router.put(
  "/update/:id",
  authMiddleware(["vendor", "admin"]),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "portfolioImages", maxCount: 5 },
    { name: "gallery", maxCount: 5 },
    { name: "introVideo", maxCount: 1 },
  ]),
  updateVendorProfile
);

// ✅ Delete vendor profile (vendor or admin)
router.delete(
  "/delete/:id",
  authMiddleware(["vendor", "admin"]),
  deleteVendorProfile
);

// ✅ Verify or feature a vendor (admin only)
router.put("/verify/:id", authMiddleware(["admin"]), verifyVendor);

// ✅ Get single vendor by ID (public) - MUST BE LAST
router.get("/:id", getVendorById);

module.exports = router;
