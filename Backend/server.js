const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("./src/models/event.model");
const connectDB = require("./src/config/db");
const { configureRealtimeAccess } = require("./src/services/realtimeAccess.service");

// =======================
// 🌍 Environment Setup
// =======================
dotenv.config();
const app = express();
app.set("etag", false); // Disable ETag generation

// =======================
// ⚙️ Database Connection
// =======================
connectDB();
console.log(
  "🔍 Attempting to connect to MongoDB with URI:",
  process.env.MONGO_URI,
);

// =======================
// 🔧 Middleware
// =======================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://eliteplan.netlify.app",
  "https://www.eliteplan.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked CORS for origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Mount telemetry before the general parser so it has its own small body limit.
app.use("/api/v1/analytics", require("./src/microservices/analytics/analytics.routes"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// 🖼️ Static Files
// =======================
const __dirnameResolved = path.resolve();
const CLIENT_URL = process.env.CLIENT_URL || "https://eliteplan.netlify.app";

app.use(
  "/uploads",
  express.static(path.join(__dirnameResolved, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", CLIENT_URL);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
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
const clientRouter = require("./src/routes/client.routes");
const plannerRouter = require("./src/routes/dashboards/plannerdashboard.routes");
const vendorRouter = require("./src/routes/vendor.routes");
const vendorDashboardRoutes = require("./src/routes/dashboards/vendordashboard.routes");
const clientDashboardRoutes = require("./src/routes/dashboards/clientdashboard.routes");
const notificationRouter = require("./src/routes/notification.routes");

// Uploads
const uploadPlannerRoutes = require("./src/routes/uploads/planner.routes");
const uploadVendorRoutes = require("./src/routes/uploads/vendor.routes");

// Auth
const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");

// Profiles
const clientProfileRoutes = require("./src/routes/profiles/client.routes");
const plannerProfileRoutes = require("./src/routes/profiles/planner.routes");
const vendorProfileRoutes = require("./src/routes/profiles/vendor.routes");

// Consultation + Bookmarks + Message
const messageRoutes = require("./src/routes/message.routes");
const initialConsultationRoutes = require("./src/routes/initialConsultation.routes");
const bookmarkRoutes = require("./src/routes/bookmark.routes");
const eventRoutes = require("./src/routes/events.routes");

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
app.use("/api/v1/admin", adminRoutes);

// Profiles
app.use("/api/v1/client-profile", clientProfileRoutes);
app.use("/api/v1/planner-profile", plannerProfileRoutes);
app.use("/api/v1/vendor-profile", vendorProfileRoutes);

// Consultation + Bookmarks + Message
app.use("/api/v1/consultation", initialConsultationRoutes);
app.use("/api/v1/bookmarks", bookmarkRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/reports", require("./src/routes/reports.routes"));
app.use("/api/v1/events", eventRoutes);

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
// 🚀 Start Server with Socket.IO
// =======================
const PORT = process.env.PORT || 3000;
const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connected users storage
const connectedUsers = {};
app.set("io", io);
app.set("connectedUsers", connectedUsers);

configureRealtimeAccess(io, connectedUsers);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed clients: ${allowedOrigins.join(", ")}`);
});
