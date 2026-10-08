const Consultation = require("../models/initialConsultation.model");
const { createNotification } = require("../services/notifications.service");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const oversight = require("../services/oversight.service");
const platformSettings = require("../services/platformSettings.service");

// ========================================================
// Create Consultation Request
// ========================================================
const createConsultation = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || !oversight.idValid(req.body.targetUser) || !["PlannerProfile", "VendorProfile"].includes(req.body.targetType)) return res.status(400).json({ success: false, message: "Provide a valid professional recipient and profile type." });
    if (!await platformSettings.allow(req, res, "consultations")) return;
    const recipient = await User.findById(req.body.targetUser).select("_id archivedAt role");
    if (!recipient || recipient.archivedAt || !["vendor", "planner"].includes(recipient.role)) return res.status(404).json({ success: false, message: "Recipient not found" });
    const targetType = recipient.role === "vendor" ? "VendorProfile" : "PlannerProfile";
    if (req.body.targetType !== targetType) return res.status(400).json({ success: false, message: "Recipient profile type does not match." });
    const TargetProfile = recipient.role === "vendor" ? VendorProfile : PlannerProfile;
    const recipientProfile = await TargetProfile.findOne({ userId: recipient._id, active: { $ne: false } }).select("_id active").lean();
    if (!recipientProfile || recipientProfile.active === false) return res.status(404).json({ success: false, message: "Recipient listing not available" });
    const editable = ["targetUser", "targetType", "fullName", "eventType", "eventDate", "eventTime", "eventLocation", "guests", "services", "vendorType", "notes", "consent", "contactMethod"];
    const consultation = await Consultation.create({
      ...Object.fromEntries(editable.filter((key) => Object.hasOwn(req.body, key)).map((key) => [key, req.body[key]])),
      user: req.user._id,
      status: "pending",
    });

    // Sender info
    const senderProfile = {
      _id: req.user._id,
      fullName: req.body.fullName || req.user.fullName || "A client",
      profileType: req.profileType || "User",
    };

    const recipientModel = consultation.targetType;
    const recipientProfileId = recipientProfile._id;

    // Create notification
    await createNotification(
      recipientProfileId,
      recipientModel,
      { _id: senderProfile._id, profileType: senderProfile.profileType },
      `You have a new consultation request from ${senderProfile.fullName}.`,
      "consultation",
    );

    res.status(201).json({ success: true, consultation: oversight.memberRecord(consultation) });
  } catch (err) {
    console.error("❌ Error creating consultation:", err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({ success: false, message: err.name === "ValidationError" ? "Provide valid consultation details." : "Unable to create this consultation." });
  }
};

// ========================================================
// Get My Consultations
// ========================================================
const getMyConsultations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const filter = { status: "pending", $or: [{ user: userId }, { targetUser: userId }] };

    let query = Consultation.find(filter).sort({ createdAt: -1 });

    query = query.populate("user", "username name imageCover");

    if (Consultation.schema.path("targetUser")) {
      query = query.populate("targetUser", "username name imageCover");
    }

    const consultations = await query.exec();

    console.log("✅ Fetched consultations for", userRole, consultations.length);
    res.status(200).json(consultations.map(oversight.memberRecord));
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

    if (!oversight.idValid(id) || !["approved", "declined"].includes(status) || Object.keys(req.body).some((key) => key !== "status")) {
      return res
        .status(400)
        .json({ message: "Status must be 'approved' or 'declined'" });
    }

    const targetType = { vendor: "VendorProfile", planner: "PlannerProfile" }[req.user.role];
    if (!targetType) return res.status(403).json({ message: "Only the receiving professional can decide a request." });
    const current = await Consultation.findOne({ _id: id, targetUser: req.user._id, targetType }).select(oversight.projection).lean();
    if (!current) return res.status(404).json({ message: "Consultation not found" });
    if (current.status !== "pending") return res.status(409).json({ message: "This request is no longer pending. Refresh its details." });
    const now = new Date();
    const updated = await Consultation.findOneAndUpdate(
      { _id: id, targetUser: req.user._id, targetType, status: "pending", ...oversight.versionFilter(current) },
      { $set: { status, ...(status === "approved" ? { approvedAt: now } : { rejectedAt: now }) }, $inc: { oversightVersion: 1 }, $push: { oversightHistory: { $each: [{ action: "member_status", by: req.user._id, at: now, reason: "Receiving professional decided the request.", from: "pending", to: status }], $slice: -100 } } },
      { new: true, runValidators: true },
    )
      .populate("client", "_id firstName username email imageCover") // virtual
      .populate("receiver", "_id firstName username email imageCover") // virtual
      .populate("user", "_id firstName username email imageCover"); // original user as fallback

    if (!updated) {
      return res.status(409).json({ message: "The request changed during this decision. Refresh before retrying." });
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

    let messageWarning = false;
    try { if (status === "approved" && client?._id && sender?._id) {
      const systemMessage = await Message.create({
        sender: sender._id,
        senderModel: "User",
        recipient: client._id,
        recipientModel: "User",
        text: `Hi ${client.firstName || client.username}, your request has been approved.`,
      });

      const io = req.app.get("io");
      const connectedUsers = req.app.get("connectedUsers") || {};
      const clientSocket = connectedUsers[client._id.toString()];

      if (clientSocket) {
        const populatedMessage = await Message.findById(systemMessage._id)
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
        io.to(clientSocket.socketId).emit("receive_message", populatedMessage);
      }
    } } catch (error) { console.error("Consultation approval message failed:", error.message); messageWarning = true; }

    res.status(200).json({ success: true, consultation: oversight.memberRecord(updated), messageWarning });
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
    if (!oversight.idValid(req.params.id)) return res.status(400).json({ message: "Invalid consultation ID" });
    const current = await Consultation.findOne({ _id: req.params.id, user: req.user._id }).select(oversight.projection).lean();
    if (!current) return res.status(404).json({ message: "Consultation not found" });
    if (current.status !== "pending" || current.oversightFlag || current.oversightHistory?.length) return res.status(409).json({ message: "A reviewed or decided request is retained. Contact support to resolve it." });
    const deleted = await Consultation.findOneAndDelete({ _id: current._id, user: req.user._id, status: "pending", ...oversight.versionFilter(current) });
    if (!deleted)
      return res.status(409).json({ message: "The request changed. Refresh before retrying." });
    res.status(200).json({ message: "Consultation deleted" });
  } catch (err) {
    console.error("Consultation deletion failed:", err.message);
    res.status(500).json({ message: "Unable to delete this consultation." });
  }
};

// ========================================================
// Get All Pending Consultations (for planners/vendors)
// ========================================================
const getPendingConsultations = async (req, res) => {
  try {
    if (!["vendor", "planner"].includes(req.user.role)) return res.status(403).json({ message: "Only professionals can review incoming requests." });
    const consultations = await Consultation.find({ status: "pending", targetUser: req.user._id })
      .populate("user", "username name imageCover")
      .sort({ createdAt: -1 });

    console.log("✅ Fetched all pending consultations:", consultations.length);
    res.status(200).json(consultations.map(oversight.memberRecord));
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
