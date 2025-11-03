// routes/message.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  createMessage,
  getConversations,
  getMessageHistory,
} = require("../controllers/message.controller");

// Apply authentication middleware to all message routes
router.use(authMiddleware());

// POST a new message
router.post("/", createMessage);

// GET all conversations for the logged-in user
router.get("/conversations", getConversations);

// GET message history with a specific participant
router.get("/history/:participantId", getMessageHistory);

module.exports = router;
