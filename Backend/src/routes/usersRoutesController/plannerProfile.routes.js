const express = require("express");
const router = express.Router();
const upload = require("../../../multer/multer");
const authMiddleware = require("../../middleware/authMiddleware");

const {
  createOrGetPlannerProfile,
  updatePlannerProfile,
  getCurrentPlannerProfile,
  getPlannerProfiles,
  getPlannerProfileById,
  deletePlannerProfile,
  getPlannersBySpecialization,
} = require("../../controllers/usersProfileController/plannerProfile.controller");

// ===================================================
// 🎯 PLANNER PROFILE ROUTES
// ===================================================

// ✅ Auto-create or get current logged-in planner profile
router.get("/me", authMiddleware(["planner"]), getCurrentPlannerProfile);

// ✅ Get all planner profiles (public)
router.get("/all", getPlannerProfiles);

// ✅ Filter planners by specialization (public)
router.get("/specialization/:specialization", getPlannersBySpecialization);

// ✅ Update planner profile (with image + gallery upload)
router.put(
  "/update/me",
  authMiddleware(["planner"]),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  updatePlannerProfile
);

// ✅ Delete own planner profile
router.delete(
  "/delete/me",
  authMiddleware(["planner"]),
  deletePlannerProfile
);

// ✅ Get a specific planner by ID (public)
router.get("/:id", getPlannerProfileById);

module.exports = router;
