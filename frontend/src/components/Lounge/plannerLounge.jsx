import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useAuth } from "../../context/authStore";
import api, { getApiErrorMessage } from "../../utils/axios";
import { log, error as logError } from "../../utils/logger";

import Sidebar from "./PlannerPieces/Sidebar";
import Overview from "./PlannerPieces/Overview";
import DashboardCards from "./PlannerPieces/DashboardCards";
import PendingRequests from "./PlannerPieces/PendingRequests";
import Messages from "./PlannerPieces/MessagePanel";
import Profile from "./PlannerPieces/Profile";
import NotificationCenter from "../../pages/NotificationCenter";
import Topbar from "./PlannerPieces/Topbar";

export default function PlannerLounge() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/planner-dashboard");
      if (res.data.success) {
        log("Planner dashboard data received:", res.data.data.pendingRequests);
        setDashboard(res.data.data);
      } else {
        setError("Failed to load planner dashboard.");
      }
    } catch (err) {
      logError("Error fetching planner dashboard:", err);
      setError(getApiErrorMessage(err, "Server error while fetching dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!user?._id) return;

    if (!socketRef.current) {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      socketRef.current = io(backendUrl, { withCredentials: true });
    }

    const socket = socketRef.current;

    const handleConnect = () => {
      log("Planner connected to WebSocket server");
      socket.emit("join", { userId: user._id, role: user.role });
    };

    const handleNotification = () => {
      log("Planner received new notification");
      fetchDashboard();
    };

    socket.on("connect", handleConnect);
    socket.on("new_notification", handleNotification);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_notification", handleNotification);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchDashboard]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-brand-navy">
        Loading Planner Lounge...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-600">
        {error}
      </div>
    );
  }

  const companyName = dashboard?.companyName || "ElitePlan";
  const plannerProfile = dashboard?.plannerProfile || null;

  const pendingRequestsCount = dashboard?.pendingRequests?.length || 0;
  const counts = {
    requests: pendingRequestsCount,
    messages: unreadMessagesCount,
    notifications: unreadNotificationsCount,
  };

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
        return (
          <Messages
            plannerId={user?._id}
            onUnreadCountChange={setUnreadMessagesCount}
          />
        );
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
    } catch (err) {
      logError("Logout API call failed:", err);
    } finally {
      socketRef.current?.disconnect();
      logout();
      navigate("/");
    }
  };

  const handleLogoutWithDelay = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await handleLogout();
      setIsLoggingOut(false);
    }, 3000);
  };

  return (
    <div className="flex h-screen bg-brand-ivory text-brand-charcoal">
      <Sidebar
        companyName={companyName}
        user={plannerProfile}
        counts={counts}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogoutWithDelay}
        isLoggingOut={isLoggingOut}
        setIsMobileOpen={setIsMobileOpen}
        isMobileOpen={isMobileOpen}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      <div
        className="flex-1 flex flex-col min-h-0"
        onClick={() => {
          if (isMobileOpen) setIsMobileOpen(false);
        }}
      >
        <Topbar
          companyName={companyName}
          initialNotifications={dashboard.notifications}
          onUnreadCountChange={setUnreadNotificationsCount}
          pendingRequestsCount={pendingRequestsCount}
          onRefreshData={fetchDashboard}
          setActiveSection={setActiveSection}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
