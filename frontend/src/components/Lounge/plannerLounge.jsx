// src/components/PlannerPieces/PlannerLounge.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";

// Components
import Sidebar from "./PlannerPieces/Sidebar";
import Overview from "./PlannerPieces/Overview";
import DashboardCards from "./PlannerPieces/DashboardCards";
import Notifications from "../Shared/Notifications";
import PendingRequests from "./PlannerPieces/PendingRequests";
import Messages from "./PlannerPieces/MessagePanel";
import Profile from "./PlannerPieces/Profile";
import NotificationCenter from "../../pages/NotificationCenter";

// Topbar is now self-contained with Notifications
import Topbar from "./PlannerPieces/Topbar";

export default function PlannerLounge() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/planner-dashboard");
      if (res.data.success) {
        console.log(
          "✅ Planner Dashboard Data Received:",
          res.data.data.pendingRequests
        );
        setDashboard(res.data.data);
      } else {
        setError("Failed to load planner dashboard.");
      }
    } catch (err) {
      console.error("❌ Error fetching planner dashboard:", err);
      setError("Server error while fetching dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-brand-navy">
        Loading Planner Lounge...
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-screen text-red-600">
        {error}
      </div>
    );

  const companyName = dashboard?.companyName || "ElitePlan";
  const plannerProfile = dashboard?.plannerProfile || null;

  const pendingRequestsCount = dashboard?.pendingRequests?.length || 0;
  const counts = {
    requests: pendingRequestsCount,
    messages: dashboard?.messages?.length || 0,
    notifications: unreadNotificationsCount,
  };

  // Save handler passed to Profile
  const handleProfileSave = (updatedProfile) => {
    setDashboard((prev) => ({
      ...prev,
      plannerProfile: updatedProfile,
    }));
  };

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <>
            <DashboardCards
              metrics={dashboard.metrics}
              averageRating={dashboard.averageRating}
            />
            <Overview events={dashboard.events} />
          </>
        );
      case "events":
        return <Overview events={dashboard.events} />;
      case "requests":
        return <PendingRequests />;
      case "messages":
        return <Messages messages={dashboard.messages} />;
      case "profile":
        return <Profile planner={plannerProfile} onSave={handleProfileSave} />;
      case "notifications":
        return <NotificationCenter />;
      default:
        return <Overview events={dashboard.events} />;
    }
  };

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
    // User requested 3000ms delay
    setTimeout(async () => {
      await handleLogout();
      setIsLoggingOut(false);
    }, 3000);
  };

  return (
    <div className="flex h-screen bg-brand-ivory text-brand-charcoal">
      {/* Sidebar */}
      <Sidebar
        companyName={companyName}
        user={plannerProfile}
        counts={counts}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogoutWithDelay}
        isLoggingOut={isLoggingOut}
        setIsMobileOpen={setIsMobileOpen}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <Topbar
          companyName={companyName}
          initialNotifications={dashboard.notifications}
          onUnreadCountChange={setUnreadNotificationsCount}
          pendingRequestsCount={pendingRequestsCount}
          onRefreshData={fetchDashboard}
          setActiveSection={setActiveSection}
        />

        {/* Main content area with scrollable container */}
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
