// src/controllers/plannerMessages.controller.js
const Message = require("../models/message.model");
const User = require("../models/user.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");

const createMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, text, recipientModel, senderModel } = req.body;

    if (!recipientId || !text) {
      return res
        .status(400)
        .json({ message: "Recipient and text are required" });
    }

    // Determine recipient model dynamically if not provided
    let resolvedRecipientModel = recipientModel;
    if (!resolvedRecipientModel) {
      const recipientUser = await User.findById(recipientId);
      const recipientVendor = await VendorProfile.findOne({
        user: recipientId,
      });
      const recipientPlanner = await PlannerProfile.findOne({
        user: recipientId,
      });

      if (recipientUser) resolvedRecipientModel = "ClientProfile";
      else if (recipientVendor) resolvedRecipientModel = "VendorProfile";
      else if (recipientPlanner) resolvedRecipientModel = "PlannerProfile";
      else resolvedRecipientModel = "User"; // fallback
    }

    // Determine sender model dynamically if missing
    const resolvedSenderModel =
      senderModel || req.profileType || "PlannerProfile";

    const message = await Message.create({
      sender: senderId,
      senderModel: resolvedSenderModel,
      recipient: recipientId,
      recipientModel: resolvedRecipientModel,
      text,
    });

    // Populate the sender details for the real-time event
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username firstName name imageCover role")
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
      .populate("sender", "username firstName name imageCover role")
      .populate("recipient", "username firstName name imageCover role")
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
              m.sender?._id?.equals(otherId)
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
      .populate("sender", "username firstName name imageCover role")
      .lean();

    res.status(200).json({
      success: true,
      data: messages.map((m) => ({
        ...m,
        senderId: m.sender._id,
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
