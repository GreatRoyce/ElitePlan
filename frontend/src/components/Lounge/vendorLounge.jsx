// src/components/VendorLounge.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import io from "socket.io-client";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";

// Components
import Sidebar from "./VendorPieces/Sidebar";
import Topbar from "./VendorPieces/Topbar";
import VendorDashboard from "./VendorPieces/VendorDashboard";
import PendingRequests from "./VendorPieces/PendingRequests";
import Messages from "./VendorPieces/Messages";
import MyProfile from "./VendorPieces/MyProfile";
import NotificationCenter from "../../pages/NotificationCenter";

// Loading Components
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin mb-4" />
      <div
        className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
        style={{ animationDelay: "-0.5s" }}
      />
    </div>
    <p className="text-gray-600 font-medium mt-4">
      Loading your vendor dashboard...
    </p>
    <p className="text-sm text-gray-500 mt-2">
      Getting everything ready for you
    </p>
  </div>
);

const ErrorState = ({ error, onRetry, loading }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-red-50 p-6">
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-600 mb-6">{error}</p>
      <button
        onClick={onRetry}
        disabled={loading}
        className="px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Retrying...
          </span>
        ) : (
          "Try Again"
        )}
      </button>
    </div>
  </div>
);

export default function VendorLounge() {
  const [activeSection, setActiveSection] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Get user from auth context

  // Fetch vendor dashboard including notifications
  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const res = await api.get("/vendor-profile/me");
      console.log("Vendor dashboard data:", res.data);

      if (res.data.success) {
        setDashboard(res.data.data);
        setLastRefreshed(new Date());
      } else {
        throw new Error("Failed to load dashboard data");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Error fetching vendor data";
      setError(errorMessage);
      console.error("Dashboard fetch error:", err);

      if (err.response?.status === 404) {
        setActiveSection("profile");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time notification listener
  useEffect(() => {
    if (!user?._id) return;

    const socket = io("http://localhost:5000"); // Your backend URL

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
      socket.emit("join_room", user._id);
    });

    socket.on("new_notification", (notification) => {
      console.log("🎉 Received new notification:", notification);
      // Add notification to the topbar and update the count
      setDashboard((prev) => ({
        ...prev,
        notifications: [notification, ...(prev.notifications || [])],
      }));
    });

    return () => socket.disconnect();
  }, [user]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      logout();
      navigate("/");
    }
  };

  const handleLogoutWithDelay = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await handleLogout();
      setIsLoggingOut(false);
    }, 1500);
  };

  // Filter events with better search
  const filteredEvents = useMemo(() => {
    if (!dashboard?.assignedEvents) return [];

    return dashboard.assignedEvents.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.name?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower);

      const matchesFilter =
        activeFilter === "all" || event.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [dashboard?.assignedEvents, searchTerm, activeFilter]);

  // Compute performance metrics with fallbacks
  const performanceMetrics = useMemo(() => {
    if (!dashboard) return null;

    const stats = dashboard.vendorStats || {};
    const totalBookings = stats.totalBookings || 0;
    const completedBookings = stats.completedBookings || 0;
    const totalReviews = stats.totalReviews || 0;
    const averageRating = stats.averageRating || 0;
    const completionRate = totalBookings
      ? (completedBookings / totalBookings) * 100
      : 0;
    const responseRate = stats.responseRate || 0;

    return {
      totalBookings,
      completedBookings,
      completionRate: Math.round(completionRate),
      averageRating: averageRating.toFixed(1),
      totalReviews,
      responseRate: Math.round(responseRate),
      revenue: stats.revenue || 0,
      upcomingBookings: stats.upcomingBookings || 0,
    };
  }, [dashboard]);

  // Consolidate counts for the sidebar
  const counts = useMemo(
    () => ({
      requests: dashboard?.pendingRequests?.length || 0,
      messages: unreadMessagesCount,
      notifications: unreadNotificationsCount,
      events: dashboard?.assignedEvents?.length || 0,
    }),
    [dashboard, unreadNotificationsCount, unreadMessagesCount]
  );

  // Handle section changes with smooth transitions
  const handleSectionChange = useCallback(
    (section) => {
      setActiveSection(section);
      // Close mobile sidebar when a section is selected
      if (isMobileOpen) {
        setIsMobileOpen(false);
      }
    },
    [isMobileOpen]
  );

  // Save handler passed to MyProfile to update the dashboard state directly
  const handleProfileSave = useCallback((updatedProfileData) => {
    setDashboard((prevDashboard) => ({
      ...prevDashboard,
      ...updatedProfileData, // Merge the updated profile data into the dashboard
    }));
  }, []);

  const VendorPendingRequests = PendingRequests;

  const renderContent = () => {
    const content = (() => {
      switch (activeSection) {
        case "overview":
          return (
            <VendorDashboard
              filteredEvents={filteredEvents}
              performanceMetrics={performanceMetrics}
              dashboard={dashboard}
              searchTerm={searchTerm}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onSearchChange={setSearchTerm}
            />
          );
        case "pending":
          return <VendorPendingRequests />;
        case "messages":
          return (
            <Messages vendorId={user?._id} onUnreadCountChange={setUnreadMessagesCount} />
          );
        case "profile":
          return (
            <MyProfile
              profileData={dashboard}
              onProfileSaved={handleProfileSave} // Use the new save handler
            />
          );
        case "notifications":
          return <NotificationCenter />;
        default:
          return (
            <VendorDashboard
              filteredEvents={filteredEvents}
              performanceMetrics={performanceMetrics}
              dashboard={dashboard}
              searchTerm={searchTerm}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onSearchChange={setSearchTerm}
            />
          );
      }
    })();

    return <div className="animate-fadeIn">{content}</div>;
  };

  // Show loading state
  if (loading && !refreshing) return <LoadingSpinner />;

  // Show error state (unless we're on profile section which might handle its own errors)
  if (error && activeSection !== "profile") {
    return (
      <ErrorState error={error} onRetry={handleRefresh} loading={refreshing} />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Sidebar
        counts={counts}
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        handleLogout={handleLogoutWithDelay}
        isLoggingOut={isLoggingOut}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        notificationCount={counts.notifications}
        vendorData={dashboard}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0 transition-all duration-300">
        <Topbar
          dashboard={dashboard}
          initialNotifications={dashboard?.notifications || []}
          onUnreadCountChange={setUnreadNotificationsCount}
          pendingRequestsCount={counts.requests}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleRefresh={handleRefresh}
          refreshing={refreshing}
          handleLogout={handleLogoutWithDelay}
          setActiveSection={setActiveSection}
          lastRefreshed={lastRefreshed}
          activeSection={activeSection}
          onMenuToggle={() => setIsMobileOpen(!isMobileOpen)}
        />

        {/* Main Content with enhanced styling */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">{renderContent()}</div>
        </main>

        {/* Refresh Indicator */}
        {refreshing && (
          <div className="fixed bottom-4 right-4 bg-brand-navy text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Updating...</span>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
}
