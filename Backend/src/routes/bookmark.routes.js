const express = require("express");
const router = express.Router();
const {
  createBookmark,
  getMyBookmarks,
  deleteBookmark,
} = require("../controllers/bookmark.controller");
const authMiddleware = require("../middleware/authMiddleware");

// 🧠 All bookmark routes are protected and for clients only
router.post("/", authMiddleware(["client"]), createBookmark);
router.get("/", authMiddleware(["client"]), getMyBookmarks);
router.delete("/:targetId", authMiddleware(["client"]), deleteBookmark);

module.exports = router;
