const Consultation = require("../models/initialConsultation.model");
const { createNotification } = require("../helpers/notificationHelper");

// ========================================================
// Create Consultation Request
// ========================================================
const createConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.create({
      ...req.body,
      user: req.user._id, // whoever is making the request
      status: "pending",
    });

    // --- Create Notification ---
    // Prepare sender profile from middleware
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
          fullName: req.user.username, // Fallback to username
          businessName: "",
          imageCover: "",
          profileType: "User",
        };

    // Call the helper to create the notification
    await createNotification(
      consultation.targetUser, // The ID of the planner/vendor profile
      consultation.targetType, // "PlannerProfile" or "VendorProfile"
      senderProfile,
      `You have a new consultation request from ${senderProfile.fullName}.`,
      "consultation"
    );

    res.status(201).json({ success: true, data: consultation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================================
// Get My Consultations (Client/Planner/Vendor)
// ========================================================
const getMyConsultations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role; // depends on your user schema

    let filter = { status: "pending" };

    // 🧠 Adjust filtering depending on who’s logged in
    if (userRole === "Client") {
      filter.user = userId;
    } else if (userRole === "Planner") {
      filter.planner = userId;
    } else if (userRole === "Vendor") {
      filter.vendor = userId;
    }

    let query = Consultation.find(filter).sort({ createdAt: -1 });

    // Conditionally populate based on what's needed and what exists in the schema.
    // The 'user' field (the creator) should always be populated.
    query = query.populate("user", "username name imageCover");

    // If the schema supports it, populate the target of the consultation.
    // This avoids the StrictPopulateError.
    if (Consultation.schema.path("targetUser")) {
      query = query.populate("targetUser", "username name imageCover");
    }
    const consultations = await query.exec();

    console.log("✅ Fetched consultations for", userRole, ":", consultations);

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

    const updated = await Consultation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    res.status(200).json(updated);
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
    if (!deleted) {
      return res.status(404).json({ message: "Consultation not found" });
    }
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
// 📦 EXPORT MODULES AT BOTTOM
// ========================================================
module.exports = {
  createConsultation,
  getMyConsultations,
  updateConsultationStatus,
  deleteConsultation,
  getPendingConsultations,
};
