const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * 🔐 Auth Middleware (optional role restriction)
 * @param {Array} roles - Array of roles allowed to access route (e.g., ['admin', 'vendor'])
 */
const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization header missing or malformed.",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Fetch user (excluding password)
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found or no longer exists.",
        });
      }

      // ✅ Role check (if roles are restricted)
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission to access this route.",
        });
      }

      // Attach user info to request
      req.user = user;
      next();
    } catch (error) {
      console.error("❌ Auth Middleware Error:", error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }
  };
};

module.exports = authMiddleware;
