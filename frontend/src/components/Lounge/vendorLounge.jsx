// src/components/VendorLounge.jsx (updated)
import React, { useState, useEffect, useMemo } from "react";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";

// Components
import Sidebar from "./VendorPieces/Sidebar";
import Topbar from "./VendorPieces/Topbar";
import VendorDashboard from "./VendorPieces/VendorDashboard";
import PendingRequests from "./VendorPieces/PendingRequests";
import Messages from "./VendorPieces/Messages";
import MyProfile from "./VendorPieces/MyProfile";

export default function VendorLounge() {
  const [activeSection, setActiveSection] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch vendor dashboard data
  const fetchDashboard = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.get("/vendor-profile/me"); // Use the specific profile endpoint
      if (res.data.success) {
        setDashboard(res.data.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching vendor data");
      // If no vendor profile exists, redirect to profile creation
      if (err.response?.status === 404) {
        setActiveSection("profile");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      navigate("/login");
    }
  };

  // Filter events based on search & status
  const filteredEvents = useMemo(() => {
    if (!dashboard?.assignedEvents) return [];
    return dashboard.assignedEvents.filter((event) => {
      const matchesSearch = event.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        activeFilter === "all" || event.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [dashboard?.assignedEvents, searchTerm, activeFilter]);

  // Compute performance metrics for vendors
  const performanceMetrics = useMemo(() => {
    if (!dashboard) return null;

    const vendorStats = dashboard.vendorStats || {};
    const totalBookings = vendorStats.totalBookings || 0;
    const completedBookings = vendorStats.completedBookings || 0;
    const totalReviews = vendorStats.totalReviews || 0;
    const averageRating = vendorStats.averageRating || 0;

    const completionRate = totalBookings
      ? (completedBookings / totalBookings) * 100
      : 0;
    const responseRate = vendorStats.responseRate || 0;

    return {
      totalBookings,
      completedBookings,
      completionRate: Math.round(completionRate),
      averageRating: averageRating.toFixed(1),
      totalReviews,
      responseRate: Math.round(responseRate),
    };
  }, [dashboard]);

  // Render the active view
  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <VendorDashboard
            filteredEvents={filteredEvents}
            performanceMetrics={performanceMetrics}
            dashboard={dashboard}
          />
        );
      case "pending":
        return <PendingRequests />;
      case "messages":
        return <Messages />;
      case "profile":
        return (
          <MyProfile profileData={dashboard} onProfileUpdate={setDashboard} />
        );
      default:
        return (
          <VendorDashboard
            filteredEvents={filteredEvents}
            performanceMetrics={performanceMetrics}
            dashboard={dashboard}
          />
        );
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-brand-navy border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-700">Loading vendor dashboard...</p>
      </div>
    );

  if (error && activeSection !== "profile")
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-dark transition"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        <Topbar
          dashboard={dashboard}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleRefresh={handleRefresh}
          refreshing={refreshing}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          handleLogout={handleLogout}
          activeSection={activeSection}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
