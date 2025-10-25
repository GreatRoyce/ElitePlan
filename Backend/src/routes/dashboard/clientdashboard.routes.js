const express = require("express");
const router = express.Router();
const {
  getClientDashboard,
  addClientBookmark,
  removeClientBookmark,
  addClientNotification,
} = require("../../controllers/dashboard/clientdashboard.controller");

const authMiddleware = require("../../middleware/authMiddleware");

// -------------------- ROUTES --------------------

// Fetch client dashboard
router.get("/", authMiddleware(["client"]), getClientDashboard);

// Add a vendor to bookmarks
router.post("/bookmark", authMiddleware(["client"]), addClientBookmark);

// Remove vendor from bookmarks
router.delete("/bookmark", authMiddleware(["client"]), removeClientBookmark);

// Add notification
router.post("/notification", authMiddleware(["client"]), addClientNotification);

module.exports = router;
