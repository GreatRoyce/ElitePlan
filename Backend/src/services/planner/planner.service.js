const updateDashboard = (dashboard) => {
  const events = dashboard.events || [];
  const payments = events.flatMap((event) => event.payments || []);

  dashboard.metrics = {
    totalEvents: events.length,
    completedEvents: events.filter((event) => event.status === "completed")
      .length,
    pendingPayments: payments.filter((payment) => payment.status === "pending")
      .length,
  };

  return dashboard.metrics;
};

const addPayment = (dashboard, eventId, paymentData) => {
  const event = dashboard.events.id(eventId);
  if (!event) throw new Error("Event not found");

  const amount = Number(paymentData.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Payment amount must be a non-negative number");
  }

  const status = paymentData.status || "pending";
  if (!["pending", "paid"].includes(status)) {
    throw new Error("Payment status must be 'pending' or 'paid'");
  }

  event.payments.push({
    amount,
    status,
    method: paymentData.method,
  });
  updateDashboard(dashboard);
};

module.exports = { updateDashboard, addPayment };
