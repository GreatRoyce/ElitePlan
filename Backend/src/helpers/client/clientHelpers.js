const ClientDashboard = require("../../models/dashboard/clientdashboard.model");

exports.getClientDashboardData = async (userId) => {
  const dashboard = await ClientDashboard.findOne({ user: userId })
    .populate("bookings.vendor", "businessName category")
    .populate("bookmarks.vendorId", "businessName category");
  return dashboard;
};

exports.addBookmark = async (userId, vendorId) => {
  const dashboard = await ClientDashboard.findOneAndUpdate(
    { user: userId },
    { $addToSet: { bookmarks: { vendorId } } },
    { new: true, upsert: true }
  );
  return dashboard;
};

exports.removeBookmark = async (userId, vendorId) => {
  const dashboard = await ClientDashboard.findOneAndUpdate(
    { user: userId },
    { $pull: { bookmarks: { vendorId } } },
    { new: true }
  );
  return dashboard;
};

exports.addNotification = async (userId, message) => {
  const dashboard = await ClientDashboard.findOneAndUpdate(
    { user: userId },
    { $push: { notifications: { message } } },
    { new: true, upsert: true }
  );
  return dashboard;
};
