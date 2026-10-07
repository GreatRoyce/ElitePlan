const User = require("../models/user.model");
const Event = require("../models/event.model");
const Consultation = require("../models/initialConsultation.model");
const VendorProfile = require("../models/vendorProfile.model");
const PlannerProfile = require("../models/plannerProfile.model");

const memberRoles = ["client", "vendor", "planner"];

const getOverview = async (req, res) => {
  try {
    const generatedAt = new Date();
    const since = new Date(generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const members = { role: { $in: memberRoles } };
    const [roleCounts, newLast7Days, recentUsers, eventCounts, consultationCounts,
      unverifiedVendors, unverifiedPlanners] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.countDocuments({ ...members, createdAt: { $gte: since } }),
      User.find(members).select("_id username role createdAt").sort({ createdAt: -1, _id: -1 }).limit(8).lean(),
      Event.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Consultation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      VendorProfile.countDocuments({ verified: { $ne: true } }),
      PlannerProfile.countDocuments({ verified: { $ne: true } }),
    ]);
    const countsByKey = (rows) => Object.fromEntries(rows.map(({ _id, count }) => [_id, count]));
    const total = (rows) => rows.reduce((sum, row) => sum + row.count, 0);
    const roles = countsByKey(roleCounts);
    const byRole = Object.fromEntries(memberRoles.map((role) => [role, roles[role] || 0]));
    return res.json({
      success: true,
      data: {
        generatedAt,
        users: {
          total: Object.values(byRole).reduce((sum, count) => sum + count, 0),
          byRole,
          adminCount: roles.admin || 0,
          newLast7Days,
          recent: recentUsers,
        },
        events: { total: total(eventCounts), byStatus: countsByKey(eventCounts) },
        consultations: { total: total(consultationCounts), byStatus: countsByKey(consultationCounts) },
        profiles: { unverifiedVendors, unverifiedPlanners },
      },
    });
  } catch (error) {
    console.error("Admin overview failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load the admin overview." });
  }
};

module.exports = { getOverview };
