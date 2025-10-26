import React from "react";
import { FaChartBar, FaCalendarAlt, FaMoneyBill } from "react-icons/fa";

export default function DashboardCards({ metrics, averageRating }) {
  const cards = [
    {
      label: "Total Events",
      value: metrics?.totalEvents || 0,
      icon: <FaChartBar className="text-brand-emerald text-2xl" />,
    },
    {
      label: "Completed Events",
      value: metrics?.completedEvents || 0,
      icon: <FaCalendarAlt className="text-brand-gold text-2xl" />,
    },
    {
      label: "Pending Payments",
      value: metrics?.pendingPayments || 0,
      icon: <FaMoneyBill className="text-brand-royal text-2xl" />,
    },
    {
      label: "Avg Rating",
      value: averageRating?.toFixed(1) || "0.0",
      icon: <FaChartBar className="text-brand-charcoal text-2xl" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white p-5 rounded-2xl shadow flex flex-col items-center"
        >
          {card.icon}
          <p className="font-semibold mt-2">{card.label}</p>
          <p className="text-xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
