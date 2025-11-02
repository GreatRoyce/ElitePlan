const VendorDashboard = require("../../models/dashboard/vendordashboard.model");
const Notification = require("../../models/notification.model");
const { updateVendorDashboard } = require("../../helpers/vendor/vendorHelpers");

/**
 * @desc Fetch vendor dashboard
 * @route GET /api/vendor/dashboard
 * @access Vendor
 */
const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.user.id; // assuming authMiddleware attaches user

    console.log("✅ getVendorDashboard triggered for:", vendorId);

    // 🧩 Try to find existing dashboard
    let dashboard = await VendorDashboard.findOne({
      vendor: vendorId,
    }).populate("orders.client orders.event ratings.client");

    // 🆕 If none found, create a default one
    if (!dashboard) {
      console.log("🆕 No vendor dashboard found — creating new one...");
      dashboard = await VendorDashboard.create({
        vendor: vendorId,
        orders: [],
        notifications: [],
        ratings: [],
        metrics: {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          revenue: 0,
        },
        averageRating: 0,
      });
    }

    // Migrate any embedded notifications to the main Notification collection
    if (dashboard.notifications && dashboard.notifications.length > 0) {
      const newNotifications = dashboard.notifications.map((n) => ({
        user: vendorId,
        userModel: "VendorProfile",
        message: n.message,
        type: n.type,
        createdAt: n.date,
      }));
      await Notification.insertMany(newNotifications);

      // Clear the old notifications
      dashboard.notifications = [];
      await dashboard.save();
    }

    // ♻️ Recalculate metrics (optional but useful)
    await updateVendorDashboard(dashboard);

    // ✅ Return dashboard data
    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("❌ Error fetching vendor dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard",
    });
  }
};

/**
 * @desc Update order status (pending → in-progress → completed, etc.)
 * @route PATCH /api/vendor/dashboard/orders/:orderId
 * @access Vendor
 */
const updateOrderStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { orderId } = req.params;
    const { status } = req.body;

    const dashboard = await VendorDashboard.findOne({ vendor: vendorId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    const order = dashboard.orders.id(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.status = status;
    order.updatedAt = Date.now();

    // Update metrics
    updateVendorDashboard(dashboard);
    await dashboard.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: dashboard,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
    });
  }
};

/**
 * @desc Add payment to an order and recalculate revenue
 * @route POST /api/vendor/dashboard/orders/:orderId/payment
 * @access Vendor
 */
const addPayment = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { orderId } = req.params;
    const { amount, status } = req.body;

    const dashboard = await VendorDashboard.findOne({ vendor: vendorId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    const order = dashboard.orders.id(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.payments.push({
      amount,
      status: status || "pending",
      date: new Date(),
    });

    // Recalculate metrics
    updateVendorDashboard(dashboard);
    await dashboard.save();

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: dashboard,
    });
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding payment",
    });
  }
};

/**
 * @desc Add a new notification to the vendor dashboard
 * @route POST /api/vendor/dashboard/notifications
 * @access Vendor
 */
const addNotification = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { message, type } = req.body;

    const dashboard = await VendorDashboard.findOne({ vendor: vendorId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    dashboard.notifications.push({ message, type });
    await dashboard.save();

    res.status(200).json({
      success: true,
      message: "Notification added successfully",
      data: dashboard.notifications,
    });
  } catch (error) {
    console.error("Error adding notification:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding notification",
    });
  }
};

/**
 * @desc Add or update a client rating for the vendor
 * @route POST /api/vendor/dashboard/ratings
 * @access Vendor
 */
const addRating = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { clientId, score, comment } = req.body;

    const dashboard = await VendorDashboard.findOne({ vendor: vendorId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    // Check if the same client has rated before
    const existingRating = dashboard.ratings.find(
      (r) => r.client.toString() === clientId
    );

    if (existingRating) {
      existingRating.score = score;
      existingRating.comment = comment;
      existingRating.date = new Date();
    } else {
      dashboard.ratings.push({ client: clientId, score, comment });
    }

    // Recalculate average rating
    const totalScore = dashboard.ratings.reduce((sum, r) => sum + r.score, 0);
    dashboard.averageRating =
      dashboard.ratings.length > 0 ? totalScore / dashboard.ratings.length : 0;

    await dashboard.save();

    res.status(200).json({
      success: true,
      message: "Rating added successfully",
      data: dashboard,
    });
  } catch (error) {
    console.error("Error adding rating:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding rating",
    });
  }
};

module.exports = {
  getVendorDashboard,
  updateOrderStatus,
  addPayment,
  addNotification,
  addRating,
};
