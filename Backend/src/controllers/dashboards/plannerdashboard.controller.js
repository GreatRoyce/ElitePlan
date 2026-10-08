const PlannerDashboard = require("../../models/dashboards/plannerdashboard.model");
const VendorDashboard = require("../../models/dashboards/vendordashboard.model");
const Notification = require("../../models/notification.model");
const InitialConsultation = require("../../models/initialConsultation.model");
const VendorProfile = require("../../models/vendorProfile.model");
const PlannerProfile = require("../../models/plannerProfile.model");
const Message = require("../../models/message.model");
const User = require("../../models/user.model");
const oversight = require("../../services/oversight.service");
const {
  updateDashboard,
  addPayment,
} = require("../../services/planner/planner.service");
const { getUserProfile } = require("../notification.controller");

// -------------------- DASHBOARD --------------------
const getDashboard = async (req, res) => {
  try {
    const plannerId = req.user._id;

    let dashboard = await PlannerDashboard.findOne({
      planner: plannerId,
    }).populate("events.client events.vendors upcomingDeadlines.event");

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

    updateDashboard(dashboard);
    const plannerProfile = await PlannerProfile.findOne({ userId: plannerId })
      .select("companyName rating")
      .lean();

    const pendingRequests = await InitialConsultation.find({
      targetUser: plannerId,
      status: "pending",
    }).populate("user", "username imageCover");

    const dashboardObject = dashboard.toObject();
    dashboardObject.events = (dashboardObject.events || []).map(oversight.memberRecord);
    dashboardObject.pendingRequests = pendingRequests.map(oversight.memberRecord);
    dashboardObject.plannerProfile = plannerProfile;
    dashboardObject.companyName =
      plannerProfile?.companyName || req.user.username || "Planner";
    dashboardObject.averageRating =
      dashboard.averageRating || plannerProfile?.rating || 0;

    res.json({ success: true, data: dashboardObject });
  } catch (error) {
    console.error("❌ getDashboard error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- EVENT --------------------
const updateEventStatus = async (req, res) => {
  try {
    const plannerId = req.user._id;
    const { eventId } = req.params;
    const { status } = req.body;
    if (!oversight.idValid(eventId) || !["upcoming", "ongoing", "completed", "cancelled"].includes(status) || Object.keys(req.body).some((key) => key !== "status")) return res.status(400).json({ success: false, message: "Invalid event status." });

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId }).select(oversight.boardProjection);
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    const event = dashboard.events.id(eventId);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    const transitions = { upcoming: ["ongoing", "cancelled"], ongoing: ["completed", "cancelled"], completed: [], cancelled: [] };
    if (!transitions[event.status]?.includes(status)) return res.status(409).json({ success: false, message: "This event cannot move to that status. Refresh before retrying." });
    const updated = await PlannerDashboard.findOneAndUpdate({ _id: dashboard._id, planner: plannerId, events: { $elemMatch: { _id: event._id, status: event.status, ...oversight.versionFilter(event) } } }, { $set: { "events.$.status": status, "events.$.updatedAt": new Date() }, $inc: { "events.$.oversightVersion": 1, __v: 1 }, $push: { "events.$.oversightHistory": { $each: [{ action: "member_status", by: plannerId, at: new Date(), reason: "Planner updated their event status.", from: event.status, to: status }], $slice: -100 } } }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: "The event changed during this update. Refresh before retrying." });
    updateDashboard(updated);
    const safe = updated.toObject(); safe.events = safe.events.map(oversight.memberRecord);
    res.json({ success: true, data: safe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- PAYMENTS --------------------
const addPaymentController = async (req, res) => {
  try {
    const plannerId = req.user._id;
    const { eventId } = req.params;
    const { amount, status, method } = req.body;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

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

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: newNotification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- RATINGS --------------------
const addRating = async (req, res) => {
  try {
    const plannerId = req.user._id;
    const { clientId, score, comment } = req.body;

    if (!clientId || score == null)
      return res.status(400).json({
        success: false,
        message: "Client ID and rating score are required.",
      });

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Dashboard not found" });

    const existingRating = dashboard.ratings.find(
      (r) => r.client.toString() === clientId,
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
    console.error("❌ Error adding rating:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while adding rating" });
  }
};

// -------------------- RECRUIT VENDOR --------------------
const recruitVendor = async (req, res) => {
  try {
    const { eventId, vendorId, role } = req.body;
    const plannerId = req.user._id;

    const dashboard = await PlannerDashboard.findOne({ planner: plannerId });
    if (!dashboard)
      return res
        .status(404)
        .json({ success: false, message: "Planner dashboard not found" });

    const event = dashboard.events.id(eventId);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    const alreadyAdded = event.vendors.some(
      (v) => v.vendor.toString() === vendorId,
    );
    if (alreadyAdded)
      return res
        .status(400)
        .json({ success: false, message: "Vendor already recruited" });

    event.vendors.push({ vendor: vendorId, role });
    await dashboard.save();

    let vendorDashboard = await VendorDashboard.findOne({ vendor: vendorId });
    if (!vendorDashboard)
      vendorDashboard = await VendorDashboard.create({
        vendor: vendorId,
        assignedEvents: [event._id],
      });
    else if (!vendorDashboard.assignedEvents.includes(event._id)) {
      vendorDashboard.assignedEvents.push(event._id);
      await vendorDashboard.save();
    }

    const vendorProfile = (await VendorProfile.findOne({ userId: vendorId })
      .select("_id")
      .lean()) || { _id: vendorId };

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
      message:
        "Vendor successfully tied to event and synced to vendor dashboard",
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
    const plannerId = req.user._id;

    const messages = await Message.find({
      $or: [{ sender: plannerId }, { recipient: plannerId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "sender",
        model: User,
        select: "username firstName imageCover role",
      })
      .populate({
        path: "recipient",
        model: User,
        select: "username firstName imageCover role",
      })
      .lean();

    const conversationsMap = {};
    messages.forEach((msg) => {
      const other =
        msg.sender?._id?.toString() === plannerId.toString()
          ? msg.recipient
          : msg.sender;
      if (!other?._id) return;
      const otherId = other._id.toString();

      if (!conversationsMap[otherId]) {
        conversationsMap[otherId] = {
          participant: other,
          lastMessage: msg,
          messages: [msg],
        };
      } else {
        conversationsMap[otherId].messages.push(msg);
        if (msg.createdAt > conversationsMap[otherId].lastMessage.createdAt)
          conversationsMap[otherId].lastMessage = msg;
      }
    });

    res
      .status(200)
      .json({ success: true, conversations: Object.values(conversationsMap) });
  } catch (err) {
    console.error("❌ Error fetching planner conversations:", err);
    res.status(500).json({ message: "Server error fetching conversations" });
  }
};

// Send a message as planner
const sendPlannerMessage = async (req, res) => {
  try {
    const plannerId = req.user._id;
    const { recipientId, text } = req.body;

    if (!recipientId || !text)
      return res.status(400).json({ message: "recipientId and text required" });

    const recipient = await User.findById(recipientId).select("_id archivedAt");
    if (!recipient || recipient.archivedAt) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const message = await Message.create({
      sender: plannerId,
      senderModel: "User",
      recipient: recipient._id,
      recipientModel: "User",
      text,
    });

    const populated = await Message.findById(message._id)
      .populate({
        path: "sender",
        model: User,
        select: "username name imageCover role",
      })
      .populate({
        path: "recipient",
        model: User,
        select: "username name imageCover role",
      })
      .lean();

    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers") || {};
    const recipientSocket = connectedUsers[recipientId];
    if (recipientSocket)
      io.to(recipientSocket.socketId).emit("receive_message", populated);

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
};
