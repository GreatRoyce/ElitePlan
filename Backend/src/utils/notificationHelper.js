const Consultation = require("../models/initialConsultation.model");
const { createNotification } = require("../utils/notificationHelper");

const createConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.create({
      ...req.body,
      user: req.user._id, // requester
      status: "pending",
    });

    // Prepare sender profile
    const senderProfile = req.profile
      ? {
          _id: req.profile._id,
          fullName: req.profile.fullName,
          businessName: req.profile.businessName,
          imageCover: req.profile.imageCover,
          profileType: req.profileType,
        }
      : {
          _id: req.user._id,
          fullName: req.user.fullName,
          businessName: "",
          imageCover: "",
          profileType: "User",
        };

    // Recipient
    const recipientId = consultation.targetUser; // ObjectId of Planner/Vendor
    const recipientModel = consultation.targetType; // "PlannerProfile" or "VendorProfile"

    await createNotification(
      recipientId,
      recipientModel,
      senderProfile,
      `You have a new consultation request from ${senderProfile.fullName}.`,
      "consultation"
    );

    res.status(201).json({ success: true, consultation });
  } catch (err) {
    console.error("❌ Error creating consultation:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createConsultation };
