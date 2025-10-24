// models/user.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["client", "vendor", "planner"],
      required: true,
    },

    // This links the user to their role-specific profile
    profile: {
      type: Schema.Types.ObjectId,
      refPath: "roleProfileModel",
    },

    // This tells mongoose which model to use for `profile`
    roleProfileModel: {
      type: String,
      enum: ["ClientProfile", "VendorProfile", "PlannerProfile"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
