const mongoose = require("mongoose");

const initialConsultationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  fullName: { type: String, required: true },
  eventType: { type: String, required: true },
  eventDate: { type: String, required: true },
  eventTime: { type: String },

  // ✅ Proper nested location
  eventLocation: {
    state: { type: String },
    city: { type: String },
    country: { type: String },
  },

  // ✅ Guests range
  guests: {
    min: { type: Number },
    max: { type: Number },
  },

  services: { type: [String] },
  vendorType: { type: [String] },
  notes: { type: String },
  consent: { type: Boolean, default: false },
  contactMethod: { type: String },
  createdAt: { type: Date, default: Date.now },
});


// ✅ Custom validation (the correct way for nested objects)
initialConsultationSchema.pre("validate", function (next) {
  const guests = this.guests;
  if (
    guests &&
    guests.min != null &&
    guests.max != null &&
    guests.max < guests.min
  ) {
    return next(new Error("Maximum guests cannot be less than minimum guests"));
  }
  next();
});

module.exports = mongoose.model(
  "InitialConsultation",
  initialConsultationSchema
);
