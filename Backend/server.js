const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("./src/models/event.model");
const connectDB = require("./database/dbConnection");

// =======================
// 🌍 Environment Setup
// =======================
dotenv.config();
const app = express();
app.set("etag", false); // Disable ETag generation for all responses

// =======================
// ⚙️ Database Connection
// =======================
connectDB();
console.log(
  "🔍 Attempting to connect to MongoDB with URI:",
  process.env.MONGO_URI
);

// =======================
// 🔧 Middleware
// =======================
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: process.env.MODE === "react" ? CLIENT_URL : "*", // Allow all origins in Postman mode
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

console.log(
  process.env.MODE === "react"
    ? `🔒 React mode: CORS restricted to ${CLIENT_URL}`
    : "🧪 Postman mode: CORS open to all origins"
);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// 🖼️ Static Files (Uploads)
// =======================
const __dirnameResolved = path.resolve();
app.use(
  "/uploads",
  express.static(path.join(__dirnameResolved, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", CLIENT_URL);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// =======================
// 📍 Base Route
// =======================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🌟 ElitePlan API Root - Server is running ✅",
  });
});

// =======================
// 🧩 Import Routes
// =======================

// Core platform routes
const clientRouter = require("./src/routes/client.routes");
const plannerRouter = require("./src/routes/dashboard/plannerdashboard.routes");
const vendorRouter = require("./src/routes/vendor.routes");
const vendorDashboardRoutes = require("./src/routes/dashboard/vendordashboard.routes");
const clientDashboardRoutes = require("./src/routes/dashboard/clientdashboard.routes");
const notificationRouter = require("./src/routes/notification.routes");

// Uploads
const uploadPlannerRoutes = require("./src/routes/usersRoutesController/uploadPlanner.routes");
const uploadVendorRoutes = require("./src/routes/usersRoutesController/uploadVendor.routes");

// Auth
const authRoutes = require("./src/routes/auth.routes");

// Profiles
const clientProfileRoutes = require("./src/routes/usersRoutesController/clientProfile.routes");
const plannerProfileRoutes = require("./src/routes/usersRoutesController/plannerProfile.routes");
const vendorProfileRoutes = require("./src/routes/usersRoutesController/vendorProfile.routes");

// Consultation + Bookmarks
const initialConsultationRoutes = require("./src/routes/initialConsultation.routes");
const bookmarkRoutes = require("./src/routes/bookmark.routes");

// =======================
// 🚦 Mount Routes
// =======================
app.use("/api/v1", clientRouter);
app.use("/api/v1/planner-dashboard", plannerRouter);
app.use("/api/v1", vendorRouter);
app.use("/api/v1/vendor-dashboard", vendorDashboardRoutes);
app.use("/api/v1/client-dashboard", clientDashboardRoutes);
app.use("/api/v1/notifications", notificationRouter);

// Upload routes
app.use("/api/v1/upload", uploadPlannerRoutes);
app.use("/api/v1/upload-vendor", uploadVendorRoutes);

// Auth
app.use("/api/v1/auth", authRoutes);

// Profiles
app.use("/api/v1/client-profile", clientProfileRoutes);
app.use("/api/v1/planner-profile", plannerProfileRoutes);
app.use("/api/v1/vendor-profile", vendorProfileRoutes);

// Consultation + Bookmarks
app.use("/api/v1/consultation", initialConsultationRoutes);
app.use("/api/v1/bookmarks", bookmarkRoutes);

// =======================
// ⚠️ Global Error Handler
// =======================
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Max size is 2MB.",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// =======================
// 🚀 Start Server
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
