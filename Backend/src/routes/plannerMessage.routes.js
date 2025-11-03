// routes/plannerMessage.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  createMessage,
  getConversations,
  getMessageHistory,
} = require("../controllers/plannerMessages.controller");

// Apply authentication middleware to all planner message routes
router.use(authMiddleware());

// POST a new message
router.post("/", createMessage);

// GET all conversations for the logged-in planner
router.get("/conversations", getConversations);

// GET message history with a specific participant
router.get("/history/:participantId", getMessageHistory);

module.exports = router;
