const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");
const {
  createPlannerProfile,
  getPlannerProfiles,
  getPlannerProfileById, // This was already correct
  updatePlannerProfile,
  deletePlannerProfile,
  getPlannersBySpecialization, // optional filter
} = require("../../controllers/usersProfileController/plannerProfile.controller");

// =======================
// 🎯 Planner Profile Routes
// =======================

// ✅ Create planner profile (only logged-in planners or admins)
router.post(
  "/create",
  authMiddleware(["planner", "admin"]),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  createPlannerProfile
);

// ✅ Get all planner profiles (public)
router.get("/all", getPlannerProfiles);

// ✅ Filter planners by specialization (public)
router.get("/specialization/:specialization", getPlannersBySpecialization);

// ✅ Update planner profile (planner or admin)
router.put(
  "/update/:id",
  authMiddleware(["planner", "admin"]),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  updatePlannerProfile
);

// ✅ Delete planner profile (planner or admin)
router.delete(
  "/delete/:id",
  authMiddleware(["planner", "admin"]),
  deletePlannerProfile
);

// ✅ Get single planner profile by ID (public) - MUST BE LAST
router.get("/:id", getPlannerProfileById);

module.exports = router;
