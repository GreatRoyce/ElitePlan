const categories = {
  moderation: ["warn", "suspend", "ban", "restore"],
  archive: ["archive", "unarchive"],
  staff: ["appoint", "update", "revoke"],
  reports: ["claim", "assign", "release", "note", "priority", "resolve", "dismiss", "reopen"],
  verification: ["approve", "reject", "revoke"],
  content: ["hide", "restore"],
  operations: ["note", "flag", "clear_flag", "decline", "complete", "start", "cancel", "reopen"],
  support: ["claim", "release", "reply", "note", "priority", "request_info", "resolve", "reject", "accept", "reopen"],
  announcements: ["create", "update", "publish", "withdraw", "archive"],
  settings: ["update"],
  adverts: ["create", "update", "publish", "withdraw", "archive"],
};
const actions = [...new Set([...Object.values(categories).flat(), "invalid"])];
const targetKinds = ["account", "report", "vendor", "planner", "consultations", "events", "planner-events", "support", "announcement", "platform", "advert", "unknown"];
const outcomes = ["pending", "succeeded", "denied", "failed", "unconfirmed"];
const idValid = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
module.exports = { categories, actions, targetKinds, outcomes, idValid, object };
