const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetModel",
      required: true,
    },
    targetModel: {
      type: String,
      enum: ["VendorProfile", "PlannerProfile"],
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate bookmarks for same target
bookmarkSchema.index(
  { client: 1, targetId: 1, targetModel: 1 },
  { unique: true }
);

module.exports = mongoose.model("Bookmark", bookmarkSchema);
