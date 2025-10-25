/**
 * Planner Helpers
 * ----------------
 * Contains functions to update planner dashboard metrics:
 * - Event counts (pending/booked/ongoing/completed/cancelled)
 * - Revenue (total and pending)
 * - Upcoming deadlines
 * - Add payments to events
 */

/**
 * updateDashboard
 * Recalculates the planner dashboard metrics, revenue, and upcoming deadlines
 * @param {Object} dashboard - PlannerDashboard mongoose document
 */
const updateDashboard = (dashboard) => {
  // 1️⃣ Reset metrics
  const metrics = {
    pendingRequests: 0,
    bookedEvents: 0,
    ongoingEvents: 0,
    completedEvents: 0,
    cancelledEvents: 0,
  };

  let totalRevenue = 0;
  let pendingRevenue = 0;
  const upcomingDeadlines = [];
  const now = new Date();

  // 2️⃣ Loop through all events
  dashboard.events.forEach(event => {
    // Event metrics
    switch (event.status) {
      case 'pending': metrics.pendingRequests++; break;
      case 'booked': metrics.bookedEvents++; break;
      case 'ongoing': metrics.ongoingEvents++; break;
      case 'completed': metrics.completedEvents++; break;
      case 'cancelled': metrics.cancelledEvents++; break;
    }

    // Payments
    if (event.payments && event.payments.length) {
      event.payments.forEach(payment => {
        if (payment.status === "paid") totalRevenue += payment.amount;
        else if (payment.status === "pending") pendingRevenue += payment.amount;
      });
    }

    // Upcoming deadlines (tasks)
    if (event.tasks && event.tasks.length) {
      event.tasks.forEach(task => {
        if (task.status === "pending" && new Date(task.dueDate) >= now) {
          upcomingDeadlines.push({
            event: event._id,
            taskTitle: task.title,
            dueDate: task.dueDate,
            status: task.status,
          });
        }
      });
    }
  });

  // 3️⃣ Update dashboard document
  dashboard.pendingRequests = metrics.pendingRequests;
  dashboard.bookedEvents = metrics.bookedEvents;
  dashboard.ongoingEvents = metrics.ongoingEvents;
  dashboard.completedEvents = metrics.completedEvents;
  dashboard.cancelledEvents = metrics.cancelledEvents;

  dashboard.totalRevenue = totalRevenue;
  dashboard.pendingRevenue = pendingRevenue;
  dashboard.upcomingDeadlines = upcomingDeadlines;
};

/**
 * addPayment
 * Adds a payment to an event and recalculates dashboard metrics
 * @param {Object} dashboard - PlannerDashboard mongoose document
 * @param {String} eventId - Event ID
 * @param {Object} payment - Payment object { amount, status, method }
 */
const addPayment = (dashboard, eventId, payment) => {
  const event = dashboard.events.id(eventId);
  if (!event) throw new Error('Event not found');

  if (!event.payments) event.payments = [];
  event.payments.push({
    ...payment,
    date: new Date()
  });

  // Recalculate dashboard metrics
  updateDashboard(dashboard);
};

module.exports = { updateDashboard, addPayment };
