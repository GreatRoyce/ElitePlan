const PlannerDashboard = require("../../models/dashboard/plannerdashboard.model");
const VendorDashboard = require("../../models/dashboard/vendordashboard.model");
const Notification = require("../../models/notification.model");
const InitialConsultation = require("../../models/initialConsultation.model");
const VendorProfile = require("../../models/vendorProfile.model");
const Message = require("../../models/message.model");
const {
  updateDashboard,
  addPayment,
} = require("../../helpers/planner/plannerHelpers");
const { getUserProfile } = require("../notification.controller");

// -------------------- DASHBOARD --------------------
const getDashboard = async (req, res) => {
  try {
    const plannerId = req.user.id;

    let dashboard = await PlannerDashboard.findOne({ planner: plannerId })
      .populate("events.client events.vendors upcomingDeadlines.event");

    if (!dashboard) {
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

    await updateDashboard(dashboard);

    const pendingRequests = await InitialConsultation.find({
      targetUser: plannerId,
      status: "pending",
    }).populate("user", "username imageCover");

    const dashboardObject = dashboard.toObject();
    dashboardObject.pendingRequests = pendingRequests;

    res.json({ success: true, data: dashboardObject });
  } catch (error) {
    console.error("❌ getDashboard error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- EVENT --------------------
const updateEventStatus = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { eventId } = req.params;
    const { status } = req.body;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard) return res.status(404).json({ success: false, message: "Dashboard not found" });

    const event = dashboard.events.id(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    event.status = status;
    event.updatedAt = Date.now();

    updateDashboard(dashboard);
    await dashboard.save();

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- PAYMENTS --------------------
const addPaymentController = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { eventId } = req.params;
    const { amount, status, method } = req.body;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard) return res.status(404).json({ success: false, message: "Dashboard not found" });

    addPayment(dashboard, eventId, { amount, status, method });

    await dashboard.save();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// -------------------- NOTIFICATIONS --------------------
const addNotification = async (req, res) => {
  try {
    const { message, type } = req.body;
    const { profileId, modelName } = await getUserProfile(req.user);

    const newNotification = await Notification.create({
      user: profileId,
      userModel: modelName,
      message,
      type: type || "general",
    });

    res.status(201).json({ success: true, message: "Notification created successfully", data: newNotification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- RATINGS --------------------
const addRating = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { clientId, score, comment } = req.body;

    if (!clientId || score == null) return res.status(400).json({ success: false, message: "Client ID and rating score are required." });

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard) return res.status(404).json({ success: false, message: "Dashboard not found" });

    const existingRating = dashboard.ratings.find((r) => r.client.toString() === clientId);
    if (existingRating) {
      existingRating.score = Number(score);
      existingRating.comment = comment;
      existingRating.date = new Date();
    } else {
      dashboard.ratings.push({ client: clientId, score: Number(score), comment });
    }

    const totalScore = dashboard.ratings.reduce((sum, r) => sum + r.score, 0);
    dashboard.averageRating = dashboard.ratings.length > 0 ? totalScore / dashboard.ratings.length : 0;

    await dashboard.save();
    res.status(200).json({ success: true, message: "Rating added successfully", data: dashboard });
  } catch (error) {
    console.error("❌ Error adding rating:", error);
    res.status(500).json({ success: false, message: "Server error while adding rating" });
  }
};

// -------------------- RECRUIT VENDOR --------------------
const recruitVendor = async (req, res) => {
  try {
    const { eventId, vendorId, role } = req.body;
    const plannerId = req.user.id;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard) return res.status(404).json({ success: false, message: "Planner dashboard not found" });

    const event = dashboard.events.id(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const alreadyAdded = event.vendors.some((v) => v.vendor.toString() === vendorId);
    if (alreadyAdded) return res.status(400).json({ success: false, message: "Vendor already recruited" });

    event.vendors.push({ vendor: vendorId, role });
    await dashboard.save();

    let vendorDashboard = await VendorDashboard.findOne({ vendor: vendorId });
    if (!vendorDashboard) vendorDashboard = await VendorDashboard.create({ vendor: vendorId, assignedEvents: [event._id] });
    else if (!vendorDashboard.assignedEvents.includes(event._id)) {
      vendorDashboard.assignedEvents.push(event._id);
      await vendorDashboard.save();
    }

    const vendorProfile = await VendorProfile.findOne({ user: vendorId }).select("_id").lean() || { _id: vendorId };

    await Notification.create({
      user: vendorProfile._id,
      userModel: "VendorProfile",
      sender: plannerId,
      senderModel: "PlannerProfile",
      message: `You’ve been assigned to the event "${event.name}".`,
      type: "booking",
    });

    res.status(200).json({
      success: true,
      message: "Vendor successfully tied to event and synced to vendor dashboard",
      data: { event: event, vendorDashboard: vendorDashboard.assignedEvents },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- MESSAGING --------------------

// Get all planner conversations
const getPlannerConversations = async (req, res) => {
  try {
    const plannerId = req.user.id;

    const messages = await Message.find({
      $or: [{ sender: plannerId }, { recipient: plannerId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username firstName imageCover")
      .populate("recipient", "username firstName imageCover")
      .lean();

    const conversationsMap = {};
    messages.forEach((msg) => {
      const other = msg.sender._id.toString() === plannerId ? msg.recipient : msg.sender;
      const otherId = other._id.toString();

      if (!conversationsMap[otherId]) {
        conversationsMap[otherId] = { participant: other, lastMessage: msg, messages: [msg] };
      } else {
        conversationsMap[otherId].messages.push(msg);
        if (msg.createdAt > conversationsMap[otherId].lastMessage.createdAt) conversationsMap[otherId].lastMessage = msg;
      }
    });

    res.status(200).json({ success: true, conversations: Object.values(conversationsMap) });
  } catch (err) {
    console.error("❌ Error fetching planner conversations:", err);
    res.status(500).json({ message: "Server error fetching conversations" });
  }
};

// Send a message as planner
const sendPlannerMessage = async (req, res) => {
  try {
    const plannerId = req.user.id;
    const { recipientId, text } = req.body;

    if (!recipientId || !text) return res.status(400).json({ message: "recipientId and text required" });

    const message = await Message.create({
      sender: plannerId,
      senderModel: "PlannerProfile",
      recipient: recipientId,
      recipientModel: "ClientProfile",
      text,
    });

    const populated = await message
      .populate("sender", "username name imageCover")
      .populate("recipient", "username name imageCover")
      .execPopulate();

    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers") || {};
    const recipientSocket = connectedUsers[recipientId];
    if (recipientSocket) io.to(recipientSocket.socketId).emit("receive_message", populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error sending planner message:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = {
  getDashboard,
  updateEventStatus,
  addPaymentController,
  addNotification,
  addRating,
  recruitVendor,
  getPlannerConversations,
  sendPlannerMessage,
}