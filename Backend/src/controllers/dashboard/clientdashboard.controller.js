const {
  getClientDashboardData,
  addBookmark,
  removeBookmark,
  addNotification,
} = require("../../helpers/client/clientHelpers");

// ✅ Fetch full dashboard data
const getClientDashboard = async (req, res) => {
  try {
    const userId = req.user?._id || req.params.userId;
    const dashboard = await getClientDashboardData(userId);
    res.status(200).json({ success: true, dashboard });
  } catch (error) {
    console.error("Error fetching client dashboard:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard." });
  }
};

// ✅ Add bookmark
const addClientBookmark = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { vendorId } = req.body;
    const updatedDashboard = await addBookmark(userId, vendorId);
    res.status(200).json({ success: true, updatedDashboard });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to add bookmark." });
  }
};

// ✅ Remove bookmark
const removeClientBookmark = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { vendorId } = req.body;
    const updatedDashboard = await removeBookmark(userId, vendorId);
    res.status(200).json({ success: true, updatedDashboard });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to remove bookmark." });
  }
};

// ✅ Add notification
const addClientNotification = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { message } = req.body;
    const updatedDashboard = await addNotification(userId, message);
    res.status(200).json({ success: true, updatedDashboard });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to add notification." });
  }
};

module.exports = {
  getClientDashboard,
  addClientBookmark,
  removeClientBookmark,
  addClientNotification,
};
