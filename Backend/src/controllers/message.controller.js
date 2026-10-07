// src/controllers/plannerMessages.controller.js
const Message = require("../models/message.model");
const User = require("../models/user.model");

const createMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, text } = req.body;

    if (!recipientId || !text) {
      return res
        .status(400)
        .json({ message: "Recipient and text are required" });
    }

    const recipient = await User.findById(recipientId).select("_id archivedAt");
    if (!recipient || recipient.archivedAt) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    const message = await Message.create({
      sender: senderId,
      senderModel: "User",
      recipient: recipient._id,
      recipientModel: "User",
      text,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: "sender",
        model: User,
        select: "username firstName name imageCover role",
      })
      .populate({
        path: "recipient",
        model: User,
        select: "username firstName name imageCover role",
      })
      .lean();

    // Emit via Socket.IO if recipient is online
    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers") || {};
    const recipientSocket = connectedUsers[recipientId];
    if (recipientSocket) {
      // Emit the fully populated message object
      io.to(recipientSocket.socketId).emit("receive_message", populatedMessage);
    }

    // Send the populated message back in the HTTP response as well
    res.status(201).json({ success: true, message: populatedMessage });
  } catch (err) {
    console.error("❌ Error creating message (Planner):", err);
    res.status(500).json({ message: err.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "sender",
        model: User,
        select: "username firstName name imageCover role",
      })
      .populate({
        path: "recipient",
        model: User,
        select: "username firstName name imageCover role",
      })
      .lean();

    // Group messages by conversation partner
    const conversationsMap = {};

    messages.forEach((msg) => {
      const otherParticipant = msg.sender?._id?.equals(userId)
        ? msg.recipient
        : msg.sender;

      if (!otherParticipant?._id) return;

      const otherId = otherParticipant._id.toString();

      if (!conversationsMap[otherId]) {
        conversationsMap[otherId] = {
          participant: otherParticipant,
          lastMessage: msg,
          // Calculate unread count for this conversation
          unreadCount: messages.filter(
            (m) =>
              m.recipient?._id?.equals(userId) &&
              !m.read &&
              m.sender?._id?.equals(otherId),
          ).length,
        };
      }
    });

    const conversations = Object.values(conversationsMap);

    res.status(200).json({ success: true, conversations });
  } catch (err) {
    console.error("❌ Error fetching conversations (Planner):", err);
    res.status(500).json({ message: err.message });
  }
};

// ========================================================
// Get Message History for a specific conversation
// ========================================================
const getMessageHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { participantId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: participantId },
        { sender: participantId, recipient: userId },
      ],
    })
      .sort({ createdAt: "asc" })
      .populate({
        path: "sender",
        model: User,
        select: "username firstName name imageCover role",
      })
      .populate({
        path: "recipient",
        model: User,
        select: "username firstName name imageCover role",
      })
      .lean();

    res.status(200).json({
      success: true,
      data: messages
        .filter((message) => message.sender && message.recipient)
        .map((message) => ({
          ...message,
          senderId: message.sender._id,
          recipientId: message.recipient._id,
        })),
    });
  } catch (err) {
    console.error("❌ Error fetching message history (Planner):", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createMessage,
  getConversations,
  getMessageHistory,
};
