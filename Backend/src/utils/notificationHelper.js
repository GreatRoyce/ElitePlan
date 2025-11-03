// utils/notificationHelper.js
const Notification = require("../models/notification.model");

const createNotification = async (
  receiverId,
  receiverModel,
  senderProfile,
  message,
  type = "general",
  imageCover = null // <-- optional
) => {
  try {
    await Notification.create({
      user: receiverId, // recipient ID
      userModel: receiverModel,
      sender: senderProfile._id,
      senderModel: senderProfile.profileType,
      message,
      type,
      imageCover: imageCover || senderProfile.avatarUrl || null, // use provided image or sender's avatar
    });

    console.log("✅ Notification saved");
  } catch (err) {
    console.error("❌ Error saving notification:", err.message);
  }
};

module.exports = { createNotification };
