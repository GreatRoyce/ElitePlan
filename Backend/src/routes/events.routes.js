// src/routes/events.routes.js
const express = require("express");
const router = express.Router();
const { createEvent, getAllEvents } = require("../controllers/eventController");
const authMiddleware = require("../middleware/authMiddleware");
router.use(authMiddleware(["client", "vendor", "planner"]));
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

router.post("/", authMiddleware(["planner"]), createEvent);
router.get("/", getAllEvents);

module.exports = router;
