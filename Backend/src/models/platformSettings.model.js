const mongoose = require("mongoose");
const { Schema } = mongoose;
const switches = {
  registration: { client: { type: Boolean, default: true }, vendor: { type: Boolean, default: true }, planner: { type: Boolean, default: true } },
  consultationsEnabled: { type: Boolean, default: true },
};
const snapshot = new Schema(switches, { _id: false });
const schema = new Schema({
  ...switches,
  version: { type: Number, min: 0, default: 0 },
  history: { type: [{ by: { type: Schema.Types.ObjectId, ref: "User", required: true }, at: { type: Date, required: true }, note: { type: String, required: true, maxlength: 1000 }, version: { type: Number, required: true }, before: { type: snapshot, required: true }, after: { type: snapshot, required: true } }], default: [], select: false },
}, { timestamps: true, bufferCommands: false });
module.exports = mongoose.model("PlatformSettings", schema);
