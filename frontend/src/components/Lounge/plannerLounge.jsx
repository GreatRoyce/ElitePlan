import React, { useEffect, useState, useRef } from "react";
import api from "../../../src/utils/axios";

// Components
import Sidebar from "./PlannerPieces/Sidebar";
import Topbar from "./PlannerPieces/Topbar";
import Overview from "./PlannerPieces/Overview";
import DashboardCards from "./PlannerPieces/DashboardCards";
import Notifications from "./PlannerPieces/Notifications";
import PendingRequests from "./PlannerPieces/PendingRequests";
import Messages from "./PlannerPieces/MessagePanel";

export default function PlannerLounge() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef();

  // Fetch Planner Dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/planner-dashboard");
        if (res.data.success) {
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
    };
    fetchDashboard();
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const companyName = dashboard?.companyName || "ElitePlan"; // fallback

  // Render main content based on sidebar selection
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
        return <PendingRequests requests={dashboard.pendingRequests} />;
      case "messages":
        return <Messages messages={dashboard.messages} />;
      default:
        return <Overview events={dashboard.events} />;
    }
  };

  // Logout handler example
  const handleLogout = () => {
    console.log("Logging out...");
    // TODO: clear tokens, redirect to login page
  };

  return (
    <div className="flex min-h-screen bg-brand-ivory text-brand-charcoal">
      {/* Sidebar */}
      <Sidebar
        companyName={companyName}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onLogout={handleLogout}
      />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        <Topbar
          companyName={companyName}
          notifications={dashboard.notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notifRef={notifRef}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          {renderContent()}

          {/* Notifications dropdown */}
          {showNotifications && (
            <Notifications
              notifications={dashboard.notifications}
              close={() => setShowNotifications(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
