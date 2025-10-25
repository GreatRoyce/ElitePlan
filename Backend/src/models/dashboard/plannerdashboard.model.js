const mongoose = require('mongoose');
const { Schema } = mongoose;

const plannerDashboardSchema = new mongoose.Schema({
  planner: { type: Schema.Types.ObjectId, ref: 'Planner', required: true },

  // Events handled by this planner
  events: [
    {
      client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
      title: { type: String, required: true },
      description: { type: String },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['pending', 'booked', 'ongoing', 'completed', 'cancelled'],
        default: 'pending',
      },
      vendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
      tasks: [
        {
          title: { type: String },
          dueDate: { type: Date },
          status: { type: String, enum: ['pending', 'done'], default: 'pending' },
        },
      ],
      payments: [
        {
          amount: { type: Number, required: true },
          status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
          },
          method: { type: String }, // e.g., 'card', 'bank transfer', 'cash'
          createdAt: { type: Date, default: Date.now },
        },
      ],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],

  // Dashboard metrics
  pendingRequests: { type: Number, default: 0 },
  bookedEvents: { type: Number, default: 0 },
  ongoingEvents: { type: Number, default: 0 },
  completedEvents: { type: Number, default: 0 },
  cancelledEvents: { type: Number, default: 0 },

  // Revenue summary
  totalRevenue: { type: Number, default: 0 },
  pendingRevenue: { type: Number, default: 0 },

  // Notifications for the planner
  notifications: [
    {
      message: { type: String, required: true },
      type: { type: String, default: 'info' },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // Upcoming deadlines
  upcomingDeadlines: [
    {
      event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
      taskTitle: { type: String, required: true },
      dueDate: { type: Date, required: true },
      status: { type: String, enum: ['pending', 'done'], default: 'pending' },
    },
  ],

  // ⭐ Ratings (added section)
  ratings: [
    {
      client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
      score: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String },
      date: { type: Date, default: Date.now },
    },
  ],
  averageRating: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt on save
plannerDashboardSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PlannerDashboard', plannerDashboardSchema);
