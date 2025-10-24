const InitialConsultation = require("../models/initialConsultation.model");

exports.createConsultation = async (req, res) => {
  try {
    const userId = req.user?._id; // ✅ Comes from auth middleware
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: user not found." });
    }

    const {
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

    // ✅ Ensure required fields are present before hitting Mongoose
    if (!fullName || !eventType || !eventDate) {
      return res.status(400).json({
        message: "Please provide full name, event type, and event date.",
      });
    }

    // ✅ Create new consultation
    const newConsultation = new InitialConsultation({
      user: userId,
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
    });

    // ✅ Save and trigger schema validation (e.g., guest min/max rule)
    await newConsultation.save();

    res.status(201).json({
      message: "Consultation submitted successfully.",
      data: newConsultation,
    });
  } catch (error) {
    // ✅ Handle Mongoose validation errors explicitly
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed.",
        error: error.message,
      });
    }

    console.error("Consultation submission error:", error);
    res.status(500).json({
      message: "Error submitting consultation.",
      error: error.message,
    });
  }
};
