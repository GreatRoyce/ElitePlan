import React from "react";
import Notifications from "../../Shared/Notifications"; // ✅ shared import

export default function Topbar({
  companyName,
  initialNotifications,
  onUnreadCountChange,
  pendingRequestsCount,
  setActiveSection,
}) {
  return (
    <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 supports-backdrop-blur:bg-white/80">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        {/* Left side - Company Name */}
        <div>
          <h1 className="text-xl font-semibold text-brand-navy truncate max-w-[200px] md:max-w-none">
            {companyName || "Planner"}
          </h1>
          <p className="text-xs text-gray-500 hidden sm:block">
            Planner Dashboard
          </p>
        </div>

        {/* Right side - Notifications & pending requests */}
        <div className="flex items-center gap-4">
          {/* Optional pending requests badge */}
          {pendingRequestsCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-amber-800 font-medium">
                {pendingRequestsCount} pending
              </span>
            </div>
          )}

          {/* Shared Notifications */}
          <Notifications
            role="planner"
            pendingRequestsCount={pendingRequestsCount}
            setActiveSection={setActiveSection}
          />
        </div>
      </div>
    </header>
  );
}
