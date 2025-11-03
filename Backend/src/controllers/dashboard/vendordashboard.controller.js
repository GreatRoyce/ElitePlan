const VendorDashboard = require("../../models/dashboard/vendordashboard.model");
const Notification = require("../../models/notification.model");
const { getUserProfile } = require("../notification.controller");
const { updateVendorDashboard } = require("../../helpers/vendor/vendorHelpers");
const Message = require("../../models/message.model");

// -------------------- GET CONVERSATIONS --------------------

// GET vendor conversations
const getVendorConversations = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Fetch all messages where the vendor is sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: vendorId },
        { recipient: vendorId },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username firstName imageCover")
      .populate("recipient", "username firstName imageCover")
      .lean();

    // Group messages by conversation partner
    const conversationsMap = {};

    messages.forEach((msg) => {
      // Determine the "other" participant
      const other = msg.sender._id.equals(vendorId) ? msg.recipient : msg.sender;
      const otherId = other._id.toString();

      // Initialize conversation if not exists
      if (!conversationsMap[otherId]) {
        conversationsMap[otherId] = {
          participant: other,
          lastMessage: msg,
          messages: [msg],
        };
      } else {
        // Push to messages and keep lastMessage updated
        conversationsMap[otherId].messages.push(msg);
        if (msg.createdAt > conversationsMap[otherId].lastMessage.createdAt) {
          conversationsMap[otherId].lastMessage = msg;
        }
      }
    });

    // Convert map to array
    const conversations = Object.values(conversationsMap);

    res.status(200).json({ success: true, conversations });
  } catch (err) {
    console.error("❌ Error fetching vendor conversations:", err);
    res.status(500).json({ message: "Server error fetching conversations" });
  }
};


// -------------------- SEND MESSAGE --------------------
const sendVendorMessage = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { recipientId, text } = req.body;

    if (!recipientId || !text) {
      return res.status(400).json({ message: "recipientId and text required" });
    }

    const message = await Message.create({
      sender: vendorId,
      senderModel: "VendorProfile",
      recipient: recipientId,
      recipientModel: "ClientProfile",
      text,
    });

    const populated = await message
      .populate("sender", "username name imageCover")
      .populate("recipient", "username name imageCover")
      .execPopulate();

    // Optionally: emit via Socket.IO if you have real-time chat
    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers") || {};
    const recipientSocket = connectedUsers[recipientId];

    if (recipientSocket) {
      io.to(recipientSocket.socketId).emit("receive_message", populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error sending vendor message:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};




/**
 * @desc Fetch vendor dashboard
 * @route GET /api/vendor/dashboard
 * @access Vendor
 */
const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Fetch vendor profile
    const vendorProfile = await VendorProfile.findOne({ user: vendorId });

    // Fetch pending consultations for this vendor
    const pendingConsultations = await Consultation.find({
      status: "pending",
      targetUser: vendorId,
      targetType: "VendorProfile",
    })
      .populate("user", "username name imageCover")
      .sort({ createdAt: -1 });

    // Fetch vendor messages/conversations
    const messages = await Message.find({
      $or: [{ sender: vendorId }, { recipient: vendorId }],
    })
      .populate("sender", "username name imageCover")
      .populate("recipient", "username name imageCover")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      vendorProfile,
      pendingConsultations,
      messages,
    });
  } catch (err) {
    console.error("❌ Error fetching vendor dashboard:", err);
    res.status(500).json({ message: "Server error fetching dashboard" });
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
    const { message, type } = req.body;

    // Get the correct profile ID for the logged-in user
    const { profileId, modelName } = await getUserProfile(req.user);

    // Create a notification in the central collection
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
  getVendorConversations, // ✅ added
  sendVendorMessage,      // ✅ added
};
