const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const ClientProfile = require("../models/clientProfile.model");

const getProfileModel = (modelName) => {
  switch (modelName) {
    case "PlannerProfile":
      return PlannerProfile;
    case "VendorProfile":
      return VendorProfile;
    case "ClientProfile":
      return ClientProfile;
    default:
      return null;
  }
};

module.exports = { getProfileModel };
