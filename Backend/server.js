const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./database/dbConnection");

dotenv.config();

const app = express();

// Routers
const clientRouter = require("./src/routes/client.routes");
const plannerRouter = require("./src/routes/dashboard/plannerdashboard.routes");
const vendorRouter = require("./src/routes/vendor.routes");
const authRoutes = require("./src/routes/auth.routes");
const clientProfileRoutes = require("./src/routes/usersRoutesController/clientProfile.routes");
const plannerProfileRoutes = require("./src/routes/usersRoutesController/plannerProfile.routes");
const vendorProfileRoutes = require("./src/routes/usersRoutesController/vendorProfile.routes");
const vendorDashboardRoutes = require("./src/routes/dashboard/vendordashboard.routes");
const clientDashboardRoutes = require("./src/routes/dashboard/clientdashboard.routes");
const bookmarkRoutes = require("./src/routes/bookmark.routes");
const initialConsultationRoutes = require("./src/routes/initialConsultation.routes");

// =======================
// ⚙️ Database Connection
// =======================
connectDB();

// =======================
// 🔧 Middleware
// =======================
if (process.env.MODE === "react") {
  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );
  console.log("🔒 React mode: CORS limited to", process.env.CLIENT_URL);
} else {
  app.use(cors());
  console.log("🧪 Postman mode: CORS open to all origins");
}

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// 🖼️ Static Files
// =======================
app.use("/uploads", express.static("uploads"));

// =======================
// 📍 Routes
// =======================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ElitePlan API Root - Server is running ✅",
  });
});

// Core platform routes
app.use("/api/v1", clientRouter);
app.use("/api/v1/planner-dashboard", plannerRouter);
app.use("/api/v1", vendorRouter);
app.use("/api/v1/vendor-dashboard", vendorDashboardRoutes);
app.use("/api/v1/client-dashboard", clientDashboardRoutes);

// Auth
app.use("/api/v1/auth", authRoutes);

// Profiles
app.use("/api/v1/client-profile", clientProfileRoutes);
app.use("/api/v1/planner-profile", plannerProfileRoutes);
app.use("/api/v1/vendor-profile", vendorProfileRoutes);

// Other routes
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
