// src/components/ClientPieces/BookingsSection.jsx
import React, { useEffect, useState } from "react";
import api from "../../utils/axios";

export default function BookingsSection({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res = await api.get("/client-dashboard"); // your endpoint that populates bookings
        if (res.data.success) setBookings(res.data.dashboard.bookings || []);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        Loading your bookings...
      </div>
    );

  if (!bookings.length)
    return (
      <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No bookings yet
        </h3>
        <p className="text-gray-500">
          Once you book a planner or vendor, you’ll see it here.
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {bookings.map((b) => (
        <div
          key={b._id}
          className="bg-white border rounded-2xl shadow-sm p-6 space-y-3"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg text-brand-navy">
              {b.eventType || "Event"}
            </h3>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                b.status === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : b.status === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : b.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {b.status}
            </span>
          </div>

          <p className="text-gray-600 text-sm">
            Date: {new Date(b.date).toLocaleDateString()}
          </p>

          {b.vendor && (
            <p className="text-gray-700">
              Vendor:{" "}
              <span className="font-medium text-brand-royal">
                {b.vendor.businessName || "Vendor"}
              </span>
            </p>
          )}

          {b.planner && (
            <p className="text-gray-700">
              Planner:{" "}
              <span className="font-medium text-brand-royal">
                {b.planner.companyName || "Planner"}
              </span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
