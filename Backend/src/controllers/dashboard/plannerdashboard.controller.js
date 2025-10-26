const PlannerDashboard = require("../../models/dashboard/plannerdashboard.model");
const VendorDashboard = require("../../models/dashboard/vendordashboard.model");
const { updateDashboard, addPayment } = require("../../helpers/planner/plannerhelpers");

// @desc Fetch planner dashboard
// @route GET /api/planner/dashboard
// @access Planner

const getDashboard = async (req, res) => {
  try {
    console.log("✅ getDashboard triggered for:", req.user.id);

    const plannerId = req.user.id;

    // 🧩 Find existing dashboard
    let dashboard = await PlannerDashboard.findOne({ planner: plannerId })
      .populate("events.client events.vendors upcomingDeadlines.event");

    // 🆕 Auto-create dashboard if it doesn’t exist
    if (!dashboard) {
      console.log("🆕 No dashboard found, creating new one...");
      dashboard = await PlannerDashboard.create({
        planner: plannerId,
        events: [],
        upcomingDeadlines: [],
        notifications: [],
        metrics: {
          totalEvents: 0,
          completedEvents: 0,
          pendingPayments: 0,
        },
      });
    }

    // ♻️ Recalculate metrics (optional)
    await updateDashboard(dashboard);

    // ✅ Return dashboard
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error("❌ getDashboard error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc Update event status and recompute dashboard metrics
// @route PATCH /api/planner/dashboard/events/:eventId
// @access Planner
const updateEventStatus = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { eventId } = req.params;
    const { status } = req.body;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    const event = dashboard.events.id(eventId);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    event.status = status;
    event.updatedAt = Date.now();

    // Recalculate all dashboard metrics
    updateDashboard(dashboard);

    await dashboard.save();

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc Add a payment to an event
// @route POST /api/planner/dashboard/events/:eventId/payments
// @access Planner
const addPaymentController = async (req, res) => {
  try {
    const plannerId = req.useer.id;
    const { eventId } = req.params;
    const { amount, status, method } = req.body;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    // Use helper to add payment and recalc metrics
    addPayment(dashboard, eventId, { amount, status, method });

    await dashboard.save();

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// @desc Add a notification
// @route POST /api/planner/dashboard/notifications
// @access Planner
const addNotification = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { message, type } = req.body;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    dashboard.notifications.push({ message, type });

    // Optionally recalc metrics if notifications affect deadlines
    updateDashboard(dashboard);

    await dashboard.save();

    res.json({ success: true, data: dashboard.notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const addRating = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { clientId, score, comment } = req.body;

    // 🧩 Validate input
    if (!clientId || score == null) {
      return res.status(400).json({
        success: false,
        message: "Client ID and rating score are required.",
      });
    }

    // 🗂️ Fetch planner dashboard
    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: "Dashboard not found",
      });
    }

    // 🧮 Check if client has already rated
    const existingRating = dashboard.ratings.find(
      (r) => r.client.toString() === clientId
    );

    if (existingRating) {
      existingRating.score = Number(score);
      existingRating.comment = comment;
      existingRating.date = new Date();
    } else {
      dashboard.ratings.push({
        client: clientId,
        score: Number(score),
        comment,
      });
    }

    // 🔢 Recalculate average rating
    const totalScore = dashboard.ratings.reduce((sum, r) => sum + r.score, 0);
    dashboard.averageRating =
      dashboard.ratings.length > 0
        ? totalScore / dashboard.ratings.length
        : 0;

    await dashboard.save();

    res.status(200).json({
      success: true,
      message: "Rating added successfully",
      data: dashboard,
    });
  } catch (error) {
    console.error("❌ Error adding rating:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding rating",
    });
  }
};


// ✅ Add vendor to an event
const recruitVendor = async (req, res) => {
  try {
    const { eventId, vendorId, role } = req.body;
    const plannerId = req.user.id;

    // 🔹 Find planner dashboard
    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res.status(404).json({ success: false, message: "Planner dashboard not found" });

    // 🔹 Find target event
    const event = dashboard.events.id(eventId);
    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    // 🔹 Prevent duplicate vendor assignment
    const alreadyAdded = event.vendors.some(v => v.vendor.toString() === vendorId);
    if (alreadyAdded)
      return res.status(400).json({ success: false, message: "Vendor already recruited" });

    // 🔹 Add vendor to planner's event
    event.vendors.push({ vendor: vendorId, role });
    await dashboard.save();

    // 🔹 Update vendor's dashboard to reflect assigned event
    let vendorDashboard = await VendorDashboard.findOne({ vendor: vendorId });

    // Create vendor dashboard if not found (failsafe)
    if (!vendorDashboard) {
      vendorDashboard = await VendorDashboard.create({
        vendor: vendorId,
        assignedEvents: [event._id],
      });
    } else {
      // Prevent duplicates
      if (!vendorDashboard.assignedEvents.includes(event._id)) {
        vendorDashboard.assignedEvents.push(event._id);
        await vendorDashboard.save();
      }
    }

    // ✅ Optional: send notification to vendor
    vendorDashboard.notifications.push({
      message: `You’ve been assigned to event "${event.name}" by a planner.`,
      type: "info",
    });
    await vendorDashboard.save();

    res.status(200).json({
      success: true,
      message: "Vendor successfully tied to event and synced to vendor dashboard",
      data: {
        event: event,
        vendorDashboard: vendorDashboard.assignedEvents,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ✅ Default export object
module.exports = {
  getDashboard,
  updateEventStatus,
  addPaymentController,
  addNotification,
  addRating,
  recruitVendor,
};
