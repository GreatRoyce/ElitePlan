const mongoose = require("mongoose");
const { Schema } = mongoose;
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  announcement: { type: Schema.Types.ObjectId, ref: "Announcement", required: true, immutable: true },
  publicationVersion: { type: Number, required: true, immutable: true },
  acknowledgedAt: { type: Date, required: true },
});
schema.index({ user: 1, announcement: 1, publicationVersion: 1 }, { unique: true });
module.exports = mongoose.model("AnnouncementReceipt", schema);
