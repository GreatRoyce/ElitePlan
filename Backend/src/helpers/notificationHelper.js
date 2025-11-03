const Notification = require("../models/notification.model");

const createNotification = async (recipientId, recipientModel, senderProfile, message, type) => {
  try {
    await Notification.create({
      user: recipientId,              // Receiver
      userModel: recipientModel,      // "PlannerProfile" etc.
      sender: senderProfile._id,      // Who triggered it
      senderModel: senderProfile.profileType || "User",
      message,
      type,
    });
  } catch (error) {
    console.error("❌ Error creating notification:", error);
  }
};

module.exports = { createNotification };
