const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const ClientProfile = require("../models/clientProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");

// ==============================
// 🧍 REGISTER USER (All Roles)
// ==============================
const registerUser = async (req, res) => {
  try {
    const { username, email, password, phone, role } = req.body;

    // 1️⃣ Validate role
    const validRoles = ["client", "vendor", "planner"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // 2️⃣ Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      phone,
      role,
    });
    await newUser.save();

    // 5️⃣ Generate JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6️⃣ Respond
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 🔑 LOGIN USER
// ==============================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check user
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });

    // 2️⃣ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });

    // 3️⃣ Create token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4️⃣ Respond
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// 👤 GET CURRENT USER (/me)
// ==============================
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("❌ getMe error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getMe,
};
