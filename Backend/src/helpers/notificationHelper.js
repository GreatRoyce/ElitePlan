// utils/notificationHelper.js
const Notification = require("../models/notification.model");

const createNotification = async (recipientId, recipientModel, sender, message, type = "consultation") => {
  if (!recipientId || !recipientModel || !sender || !message) {
    throw new Error("Missing required notification fields");
  }

  const notification = await Notification.create({
    user: recipientId,
    userModel: recipientModel,
    sender: {
      _id: sender._id,
      fullName: sender.fullName,
      businessName: sender.businessName || "",
      imageCover: sender.imageCover || "",
    },
    senderModel: sender.profileType || "User",
    message,
    type,
  });

  console.log("✅ Notification created:", notification._id, "for user:", recipientId);
  return notification;
};

module.exports = { createNotification };
