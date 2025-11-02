const mongoose = require("mongoose");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const ClientProfile = require("../models/clientProfile.model");

const attachProfile = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const userId = new mongoose.Types.ObjectId(req.user._id);

    let profile;
    let profileType;
    const userRole = req.user.role;

    if (userRole === "planner") {
      profile = await PlannerProfile.findOne({ user: userId });
      profileType = "PlannerProfile";
    } else if (userRole === "vendor") {
      profile = await VendorProfile.findOne({ user: userId });
      profileType = "VendorProfile";
    } else if (userRole === "client") {
      profile = await ClientProfile.findOne({ user: userId });
      profileType = "ClientProfile";
    }

    if (!profile) {
      return res.status(400).json({
        success: false,
        message: `${userRole} profile not found for this user.`,
      });
    }

    req.profile = profile;
    req.profileType = profileType;
    next();
  } catch (err) {
    console.error("Attach Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = attachProfile;
