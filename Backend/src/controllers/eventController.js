const Event = require("../models/event.model");
const PlannerProfile = require("../models/plannerProfile.model");
const VendorProfile = require("../models/vendorProfile.model");
const ClientProfile = require("../models/clientProfile.model");
const User = require("../models/user.model");
const { idValid, memberRecord } = require("../services/oversight.service");

async function availableProfile(Model, id, role, key) {
  const profile = await Model.findById(id).select(`_id ${key} active`).lean();
  if (!profile || profile.active === false) return false;
  const owner = await User.findById(profile[key]).select("_id role archivedAt").lean();
  return owner && owner.role === role && !owner.archivedAt;
}

exports.createEvent = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["title", "date", "description", "location", "planner", "client", "vendors"].includes(key)) || typeof body.title !== "string" || !body.title.trim() || body.title.length > 200 || typeof body.date !== "string" || !Number.isFinite(new Date(body.date).getTime()) || ["description", "location"].some((key) => body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > (key === "description" ? 3000 : 500))) || body.client && !idValid(body.client) || body.planner && !idValid(body.planner) || body.vendors !== undefined && (!Array.isArray(body.vendors) || body.vendors.length > 50 || body.vendors.some((id) => !idValid(id)) || new Set(body.vendors).size !== body.vendors.length)) return res.status(400).json({ success: false, message: "Provide valid event details and participant profile IDs." });
  try {
    const planner = await PlannerProfile.findOne({ userId: req.user._id }).select("_id").lean();
    if (!planner || body.planner && String(body.planner) !== String(planner._id)) return res.status(403).json({ success: false, message: "Events must belong to your own planner profile." });
    if (body.client && !await availableProfile(ClientProfile, body.client, "client", "user")) return res.status(404).json({ success: false, message: "Client profile unavailable." });
    for (const id of body.vendors || []) if (!await availableProfile(VendorProfile, id, "vendor", "userId")) return res.status(404).json({ success: false, message: "Vendor profile unavailable." });
    const event = await Event.create({ title: body.title.trim(), date: body.date, description: body.description, location: body.location, planner: planner._id, client: body.client || undefined, vendors: body.vendors || [], status: "Upcoming" });
    res.status(201).json({ success: true, event: memberRecord(event) });
  } catch (error) {
    console.error("Event creation failed:", error.message);
    res.status(500).json({ success: false, message: "Unable to create this event." });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const config = { planner: [PlannerProfile, "userId", "planner"], vendor: [VendorProfile, "userId", "vendors"], client: [ClientProfile, "user", "client"] }[req.user.role];
    if (!config) return res.status(403).json({ success: false, message: "Member access required." });
    const [Model, key, eventKey] = config;
    const profiles = await Model.find({ [key]: req.user._id }).select("_id").lean();
    if (!profiles.length) return res.json({ success: true, events: [] });
    const events = await Event.find({ [eventKey]: { $in: profiles.map((p) => p._id) } }).populate("client", "fullName imageCover").populate("vendors", "businessName profileImage").populate("planner", "fullName companyName profileImage").sort({ date: 1, _id: 1 });
    res.status(200).json({ success: true, events: events.map(memberRecord) });
  } catch (error) {
    console.error("Member event list failed:", error.message);
    res.status(500).json({ success: false, message: "Unable to load your events." });
  }
};
