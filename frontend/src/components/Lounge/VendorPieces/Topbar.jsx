// src/components/VendorPieces/Topbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, RefreshCw, LogOut } from "lucide-react";
import Notifications from "../../Shared/Notifications"; // ✅ Shared notifications

export default function Topbar({
  dashboard,
  handleRefresh,
  refreshing,
  handleLogout,
  activeSection,
  setActiveSection,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-brand-gold/20 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left spacer to balance the layout */}
        <div className="flex-1"></div>

        {/* Right section: refresh, notifications, profile - Fixed position */}
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-brand-charcoal/70 hover:text-brand-navy hover:bg-brand-ivory rounded-xl disabled:opacity-50 transition-all duration-200 hover:shadow-sm"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          {/* ✅ Shared Notifications */}
          <Notifications
            initialNotifications={dashboard?.notifications || []}
            pendingRequestsCount={dashboard?.pendingRequests?.length || 0}
            setActiveSection={null} // vendor doesn't navigate sections on click
            onRefreshData={handleRefresh} // refresh dashboard if needed
          />

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 text-brand-navy hover:bg-brand-ivory rounded-xl transition-all duration-200 group"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-brand-gold to-brand-royal rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-white text-sm font-semibold">
                  {dashboard?.vendor?.user?.name?.charAt(0)?.toUpperCase() || "V"}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-brand-navy">
                  {dashboard?.vendor?.user?.name || "Vendor"}
                </p>
                <p className="text-xs text-brand-charcoal/60">
                  Business Account
                </p>
              </div>
              <ChevronDown
                className={`hidden sm:block w-4 h-4 text-brand-charcoal/60 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-brand-gold/20 z-50 overflow-hidden">
                <div className="p-3 border-b border-brand-gold/10 bg-brand-ivory/30">
                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-gold to-brand-royal rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {dashboard?.vendor?.user?.name
                          ?.charAt(0)
                          ?.toUpperCase() || "V"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        {dashboard?.vendor?.user?.name || "Vendor"}
                      </p>
                      <p className="text-xs text-brand-charcoal/60">
                        {dashboard?.vendor?.user?.email || "vendor@example.com"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <div className="my-1 border-t border-brand-gold/10"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-brand-charcoal/80 hover:text-brand-royal hover:bg-red-50 rounded-lg transition-all duration-200 group"
                  >
                    <LogOut className="w-4 h-4 text-brand-charcoal/60 group-hover:text-brand-royal transition-colors" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}