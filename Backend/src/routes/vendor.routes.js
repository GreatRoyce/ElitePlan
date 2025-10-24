const express = require("express");
const { registerUser } = require("../controllers/auth.controller");
const {
  createVendorProfile,
  getAllVendors,
  getVendorById,
  updateVendorProfile,
  deleteVendorProfile,
  getVendorsByCategory,
  verifyVendor,
} = require("../controllers/usersProfileController/vendorProfile.controller");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../../multer/multer"); // your multer config

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

// ======================
// ✅ Vendor Profile Routes
// ======================

// Create vendor profile (protected)
router.post(
  "/vendor-profile/create",
  authMiddleware(["vendor"]),
  upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "portfolioImages", maxCount: 5 },
  ]),
  createVendorProfile
);

// Get all vendors (public)
router.get("/vendor-profile/all", getAllVendors);

// Filter by category (public)
router.get("/vendor-profile/category/:category", getVendorsByCategory);

// Get single vendor by ID
router.get("/vendor-profile/:id", getVendorById);

// Update vendor profile
router.put(
  "/vendor-profile/:id",
  authMiddleware(["vendor"]),
  upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "portfolioImages", maxCount: 5 },
  ]),
  updateVendorProfile
);

// Delete vendor profile
router.delete(
  "/vendor-profile/:id",
  authMiddleware(["vendor"]),
  deleteVendorProfile
);

// Verify / feature vendor (admin protected, assuming middleware handles roles)
router.patch(
  "/vendor-profile/verify/:id",
  authMiddleware(["admin"]),
  verifyVendor
);

module.exports = router;
