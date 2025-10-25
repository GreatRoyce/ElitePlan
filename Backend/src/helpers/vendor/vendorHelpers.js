/**
 * Vendor Helpers
 * ----------------
 * Handles computation logic for vendor dashboard metrics:
 * - Order statistics
 * - Revenue (total + pending)
 * - Average ratings
 */

/**
 * updateVendorDashboard
 * ----------------------
 * Recalculates key metrics, revenue, and average rating
 * whenever an order or payment changes.
 * 
 * @param {Object} dashboard - VendorDashboard mongoose document
 */
const updateVendorDashboard = (dashboard) => {
  // Reset metrics
  const metrics = {
    pendingOrders: 0,
    acceptedOrders: 0,
    ongoingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  };

  let totalRevenue = 0;
  let pendingRevenue = 0;

  // 1️⃣ Loop through orders
  dashboard.orders.forEach(order => {
    switch (order.status) {
      case "pending": metrics.pendingOrders++; break;
      case "accepted": metrics.acceptedOrders++; break;
      case "in-progress": metrics.ongoingOrders++; break;
      case "completed": metrics.completedOrders++; break;
      case "cancelled": metrics.cancelledOrders++; break;
    }

    // Compute payments
    if (order.payments && order.payments.length > 0) {
      order.payments.forEach(payment => {
        if (payment.status === "paid") totalRevenue += payment.amount;
        else if (payment.status === "pending") pendingRevenue += payment.amount;
      });
    }
  });

  // 2️⃣ Compute average rating
  let averageRating = 0;
  if (dashboard.ratings && dashboard.ratings.length > 0) {
    const totalScore = dashboard.ratings.reduce((sum, r) => sum + r.score, 0);
    averageRating = totalScore / dashboard.ratings.length;
  }

  // 3️⃣ Apply updates
  dashboard.pendingOrders = metrics.pendingOrders;
  dashboard.acceptedOrders = metrics.acceptedOrders;
  dashboard.ongoingOrders = metrics.ongoingOrders;
  dashboard.completedOrders = metrics.completedOrders;
  dashboard.cancelledOrders = metrics.cancelledOrders;

  dashboard.totalRevenue = totalRevenue;
  dashboard.pendingRevenue = pendingRevenue;
  dashboard.averageRating = averageRating;
};

module.exports = { updateVendorDashboard };
