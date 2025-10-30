const InitialConsultation = require("../models/initialConsultation.model");
const User = require("../models/user.model");
const dayjs = require("dayjs");

// ===================================================
// 🎯 CREATE A NEW INITIAL CONSULTATION
// ===================================================
/**
 * @desc Create new consultation (Client → Planner/Vendor)
 * @route POST /api/v1/consultation/initial-consultation
 * @access Private (client)
 */
const createConsultation = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized." });

    const {
      targetUser,
      targetType, // "Planner" or "Vendor"
      fullName,
      eventType,
      eventDate,
      eventTime,
      eventLocation,
      guests,
      services,
      vendorType,
      notes,
      consent,
      contactMethod,
    } = req.body;

    // ✅ Validate required fields
    if (!fullName || !eventType || !eventDate || !targetUser || !targetType) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide full name, event type, event date, target user, and target type.",
      });
    }

    // ✅ Check if target user exists
    const receiver = await User.findById(targetUser);
    if (!receiver)
      return res
        .status(404)
        .json({ success: false, message: "Target user not found." });

    // ✅ Normalize and parse eventDate
    const parsedDate = dayjs(eventDate).startOf("day").toDate();

    // ✅ Prevent duplicate consultation for same day + target
    const existing = await InitialConsultation.findOne({
      user: userId,
      targetUser,
      targetType,
      eventDate: {
        $gte: dayjs(parsedDate).startOf("day").toDate(),
        $lt: dayjs(parsedDate).endOf("day").toDate(),
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a consultation scheduled with this user on that date.",
      });
    }

    // ✅ Create new consultation
    const newConsultation = await InitialConsultation.create({
      user: userId,
      targetUser,
      targetType,
      fullName,
      eventType,
      eventDate: parsedDate,
      eventTime,
      eventLocation,
      guests,
      services,
      vendorType,
      notes,
      consent,
      contactMethod,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Consultation request sent successfully.",
      data: newConsultation,
    });
  } catch (error) {
    console.error("Consultation creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating consultation.",
      error: error.message,
    });
  }
};

// ===================================================
// 👤 GET CONSULTATIONS FOR LOGGED-IN USER
// ===================================================
const getMyConsultations = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    let consultations;

    if (role === "planner") {
      // Planner/Vendor: find consultations where they are the targetUser
      consultations = await InitialConsultation.find({ targetUser: userId })
        .populate("user", "username email")
        .sort({ createdAt: -1 });
    } else if (role === "client") {
      // Client (or other roles): find consultations they created
      consultations = await InitialConsultation.find({ user: userId })
        .populate("planner", "fullName email specialization")
        .sort({ createdAt: -1 });
    }

    return res.status(200).json({
      success: true,
      count: consultations.length,
      data: consultations,
    });
  } catch (error) {
    console.error("Get Consultations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user consultations",
      error: error.message,
    });
  }
};

// ===================================================
// 🕹 UPDATE CONSULTATION STATUS
// ===================================================
const updateConsultationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "declined"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });

    const consultation = await InitialConsultation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!consultation)
      return res
        .status(404)
        .json({ success: false, message: "Consultation not found" });

    return res.status(200).json({
      success: true,
      message: "Consultation status updated successfully",
      data: consultation,
    });
  } catch (error) {
    console.error("Update Consultation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating consultation",
      error: error.message,
    });
  }
};

// ===================================================
// ❌ DELETE CONSULTATION
// ===================================================
const deleteConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await InitialConsultation.findByIdAndDelete(id);

    if (!consultation)
      return res
        .status(404)
        .json({ success: false, message: "Consultation not found" });

    return res.status(200).json({
      success: true,
      message: "Consultation deleted successfully",
    });
  } catch (error) {
    console.error("Delete Consultation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting consultation",
      error: error.message,
    });
  }
};

module.exports = {
  createConsultation,
  getMyConsultations,
  updateConsultationStatus,
  deleteConsultation,
};
