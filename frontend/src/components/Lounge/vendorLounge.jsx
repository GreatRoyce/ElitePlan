import React, { useEffect, useState } from "react";
import api from "../../utils/axios";
import { Bell, Calendar, DollarSign, Star, ClipboardList } from "lucide-react";
import Sidebar from "./VendorPieces/Sidebar";
import Topbar from "./VendorPieces/Topbar";

export default function VendorLounge() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/vendor-dashboard");
        if (res.data.success) {
          setDashboard(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching vendor dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-brand-navy">
        Loading Vendor Lounge...
      </div>
    );

  if (!dashboard)
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Could not load dashboard
      </div>
    );

  return (
    <div className="flex bg-brand-ivory min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1">
        <Topbar
          user={dashboard.vendor}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <div className="p-8">
          {/* ===================== */}
          {/* DASHBOARD STATS */}
          {/* ===================== */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<ClipboardList size={24} />}
              title="Pending Orders"
              value={dashboard.pendingOrders}
              color="bg-yellow-100 text-yellow-700"
            />
            <StatCard
              icon={<Calendar size={24} />}
              title="Assigned Events"
              value={dashboard.assignedEvents?.length || 0}
              color="bg-blue-100 text-blue-700"
            />
            <StatCard
              icon={<DollarSign size={24} />}
              title="Total Revenue"
              value={`₦${dashboard.totalRevenue.toLocaleString()}`}
              color="bg-green-100 text-green-700"
            />
            <StatCard
              icon={<Star size={24} />}
              title="Average Rating"
              value={dashboard.averageRating.toFixed(1)}
              color="bg-purple-100 text-purple-700"
            />
          </section>

          {/* ===================== */}
          {/* ASSIGNED EVENTS */}
          {/* ===================== */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              Assigned Events
            </h2>
            {dashboard.assignedEvents?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.assignedEvents.map((event) => (
                  <div
                    key={event._id}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    <h3 className="font-semibold text-brand-navy capitalize">
                      {event.name || "Untitled Event"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.date
                        ? new Date(event.date).toLocaleDateString()
                        : "No date"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No assigned events yet.</p>
            )}
          </section>

          {/* ===================== */}
          {/* NOTIFICATIONS */}
          {/* ===================== */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              Notifications
            </h2>
            <div className="space-y-3">
              {dashboard.notifications.length > 0 ? (
                dashboard.notifications.slice(0, 5).map((note) => (
                  <div
                    key={note._id}
                    className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border-l-4 border-brand-navy"
                  >
                    <p className="text-sm text-gray-700">{note.message}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">
                  You have no notifications yet.
                </p>
              )}
            </div>
          </section>

          {/* ===================== */}
          {/* RATINGS */}
          {/* ===================== */}
          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              Client Ratings
            </h2>
            <div className="space-y-3">
              {dashboard.ratings.length > 0 ? (
                dashboard.ratings.map((rating) => (
                  <div
                    key={rating._id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-brand-navy capitalize">
                        {rating.client?.name || "Anonymous"}
                      </span>
                      <span className="text-yellow-500 text-sm">
                        {"⭐".repeat(rating.score)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{rating.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No ratings yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ================================
// 📊 Reusable Stat Card Component
// ================================
function StatCard({ icon, title, value, color }) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-2xl shadow-sm ${color} bg-opacity-50`}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <h3 className="text-xl font-semibold">{value}</h3>
      </div>
      <div className="p-3 bg-white rounded-full shadow-sm">{icon}</div>
    </div>
  );
}
