const ClientProfile = require("../../models/clientProfile.model");
const User = require("../../models/user.model");

// ========== CREATE ==========
const createClientProfile = async (req, res) => {
  try {
    const {
      fullName,
      alternatePhone,
      gender,
      dateOfBirth,
      city,
      state,
      country,
    } = req.body;

    const userId = req.user.id; // ✅ from token

    // 🔍 Fetch the actual user document
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const imageCover = req.file ? req.file.path : null;

    const newProfile = new ClientProfile({
      user: userId,
      fullName,
      email: user.email, // ✅ from user document
      phone: user.phone, // ✅ from user document
      alternatePhone,
      gender,
      dateOfBirth,
      imageCover,
      locationPreference: { city, state, country },
    });

    await newProfile.save();

    res.status(201).json({
      success: true,
      message: "Client profile created successfully",
      data: newProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating client profile",
      error: error.message,
    });
  }
};

// ========== READ (ALL) ==========
const getClientProfiles = async (req, res) => {
  try {
    const profiles = await ClientProfile.find().populate("user", "name email");
    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching client profiles",
      error: error.message,
    });
  }
};

// ========== READ (SINGLE CLIENT) ==========
const getClientProfile = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ Get from token

    const profile = await ClientProfile.findOne({ user: userId }).populate(
      "user",
      "name email phone"
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Client profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching client profile",
      error: error.message,
    });
  }
};

// ========== UPDATE ==========
const updateClientProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      phone,
      alternatePhone,
      gender,
      dateOfBirth,
      city,
      state,
      country,
    } = req.body;

    const imageCover = req.file ? req.file.path.replace(/\\/g, "/") : undefined;

    const updatedProfile = await ClientProfile.findByIdAndUpdate(
      id,
      {
        fullName,
        email,
        phone,
        alternatePhone,
        gender,
        dateOfBirth,
        ...(imageCover && { imageCover }),
        locationPreference: { city, state, country },
        lastUpdated: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Client profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating client profile",
      error: error.message,
    });
  }
};

// ========== DELETE ==========
const deleteClientProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProfile = await ClientProfile.findByIdAndDelete(id);

    if (!deletedProfile) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Client profile deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting client profile",
      error: error.message,
    });
  }
};

module.exports = {
  createClientProfile,
  getClientProfiles,
  getClientProfile, // ✅ newly added
  updateClientProfile,
  deleteClientProfile,
};
