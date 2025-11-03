const Consultation = require("../models/initialConsultation.model");
const { createNotification } = require("../helpers/notificationHelper");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const Message = require("../models/message.model");

// ========================================================
// Create Consultation Request
// ========================================================
const createConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.create({
      ...req.body,
      user: req.user._id,
      status: "pending",
    });

    // Sender info
    const senderProfile = {
      _id: req.user._id,
      fullName: req.body.fullName || req.user.fullName || "A client",
      profileType: req.profileType || "User",
    };

    const recipientUserId = consultation.targetUser;
    const recipientModel = consultation.targetType;

    let recipientProfileId = recipientUserId;
    if (recipientModel === "PlannerProfile") {
      const profile = await PlannerProfile.findOne({ user: recipientUserId })
        .select("_id")
        .lean();
      if (profile) recipientProfileId = profile._id;
    } else if (recipientModel === "VendorProfile") {
      const profile = await VendorProfile.findOne({ user: recipientUserId })
        .select("_id")
        .lean();
      if (profile) recipientProfileId = profile._id;
    }

    // Create notification
    await createNotification(
      recipientProfileId,
      recipientModel,
      { _id: senderProfile._id, profileType: senderProfile.profileType },
      `You have a new consultation request from ${senderProfile.fullName}.`,
      "consultation"
    );

    res.status(201).json({ success: true, consultation });
  } catch (err) {
    console.error("❌ Error creating consultation:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// Get My Consultations
// ========================================================
const getMyConsultations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let filter = { status: "pending" };
    if (userRole === "Client") filter.user = userId;
    else if (userRole === "Planner") filter.planner = userId;
    else if (userRole === "Vendor") filter.vendor = userId;

    let query = Consultation.find(filter).sort({ createdAt: -1 });

    query = query.populate("user", "username name imageCover");

    if (Consultation.schema.path("targetUser")) {
      query = query.populate("targetUser", "username name imageCover");
    }

    const consultations = await query.exec();

    console.log("✅ Fetched consultations for", userRole, consultations.length);
    res.status(200).json(consultations);
  } catch (err) {
    console.error("❌ Error in getMyConsultations:", err);
    res.status(500).json({ message: "Server error fetching consultations" });
  }
};

// ========================================================
// Update Consultation Status
// ========================================================
const updateConsultationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "declined"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be 'approved' or 'declined'" });
    }

    // Update consultation status
    const updated = await Consultation.findByIdAndUpdate(
      id,
      {
        status,
        approvedAt: status === "approved" ? new Date() : undefined,
        rejectedAt: status === "declined" ? new Date() : undefined,
      },
      { new: true }
    )
      .populate("client", "_id firstName username email imageCover") // virtual
      .populate("receiver", "_id firstName username email imageCover") // virtual
      .populate("user", "_id firstName username email imageCover"); // original user as fallback

    if (!updated) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    // Determine the client (recipient)
    const client =
      updated.client ||
      (updated.targetType === "ClientProfile" ? updated.receiver : null) ||
      updated.user;

    // Determine the sender (planner/vendor)
    const sender =
      updated.receiver ||
      (updated.targetType === "PlannerProfile" ? updated.receiver : null) ||
      updated.user;

    if (status === "approved" && client?._id && sender?._id) {
      const senderModel =
        updated.targetType === "PlannerProfile"
          ? "PlannerProfile"
          : updated.targetType === "VendorProfile"
          ? "VendorProfile"
          : "User";

      // Create system message
      const systemMessage = await Message.create({
        sender: sender._id,
        senderModel,
        recipient: client._id,
        recipientModel: "ClientProfile",
        text: `Hi ${client.firstName || client.username}, your request has been approved.`,
      });

      // Emit real-time message via Socket.IO if connected
      const io = req.app.get("io");
      const connectedUsers = req.app.get("connectedUsers") || {};
      const clientSocket = connectedUsers[client._id];

      if (clientSocket) {
        io.to(clientSocket.socketId).emit("receive_message", {
          ...systemMessage.toObject(),
          received: true,
        });
      }
    }

    res.status(200).json({ success: true, consultation: updated });
  } catch (err) {
    console.error("❌ Error updating consultation:", err);
    res.status(500).json({ message: "Error updating consultation" });
  }
};


// ========================================================
// Delete Consultation
// ========================================================
const deleteConsultation = async (req, res) => {
  try {
    const deleted = await Consultation.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Consultation not found" });
    res.status(200).json({ message: "Consultation deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================================
// Get All Pending Consultations (for planners/vendors)
// ========================================================
const getPendingConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find({ status: "pending" })
      .populate("user", "username name imageCover")
      .populate("planner", "username name imageCover")
      .populate("vendor", "username name imageCover")
      .sort({ createdAt: -1 });

    console.log("✅ Fetched all pending consultations:", consultations.length);
    res.status(200).json(consultations);
  } catch (err) {
    console.error("❌ Error fetching pending consultations:", err);
    res.status(500).json({ message: "Server error fetching pending requests" });
  }
};

// ========================================================
// Export
// ========================================================
module.exports = {
  createConsultation,
  getMyConsultations,
  updateConsultationStatus,
  deleteConsultation,
  getPendingConsultations,
};
