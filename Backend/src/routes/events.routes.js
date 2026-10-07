// src/routes/events.routes.js
const express = require("express");
const router = express.Router();
const { createEvent, getAllEvents } = require("../controllers/eventController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware(["planner"]), createEvent);
router.get("/", getAllEvents);

module.exports = router;
