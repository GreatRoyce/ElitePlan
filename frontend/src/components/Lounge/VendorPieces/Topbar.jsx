import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  RefreshCw,
  User,
  LogOut,
  Settings,
} from "lucide-react";

export default function Topbar({
  dashboard,
  searchTerm,
  setSearchTerm,
  handleRefresh,
  refreshing,
  showNotifications,
  setShowNotifications,
  handleLogout,
  activeSection,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = dashboard?.notifications || [];
  const unreadCount = notifications.length;

  return (
    <header className="bg-white border-b border-brand-gold/20 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
      <div className="px-6 py-4 flex items-center justify-between">
        {activeSection === "overview" && (
          <div className="flex-1 max-w-lg mr-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-charcoal/60 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events, clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-brand-gold/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold bg-brand-ivory transition-all duration-200 placeholder:text-brand-charcoal/40"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-brand-charcoal/70 hover:text-brand-navy hover:bg-brand-ivory rounded-xl disabled:opacity-50 transition-all duration-200 hover:shadow-sm"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 text-brand-charcoal/70 hover:text-brand-navy hover:bg-brand-ivory rounded-xl transition-all duration-200 hover:shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-emerald text-white text-xs rounded-full flex items-center justify-center font-medium border border-white shadow-sm">
                  {Math.min(unreadCount, 9)}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-brand-gold/20 z-50 overflow-hidden">
                <div className="p-4 border-b border-brand-gold/20 bg-brand-ivory/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-brand-navy">
                      Notifications
                    </h3>
                    <span className="text-sm text-brand-charcoal/70 bg-white px-2 py-1 rounded-lg border border-brand-gold/20">
                      {unreadCount} unread
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <div
                        key={index}
                        className="p-4 border-b border-brand-gold/10 hover:bg-brand-ivory/50 cursor-pointer transition-colors duration-200 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 mt-2 bg-brand-gold rounded-full flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm text-brand-navy font-medium group-hover:text-brand-gold transition-colors">
                              {notification.message}
                            </p>
                            <p className="text-xs text-brand-charcoal/60 mt-1">
                              {notification.time || "Just now"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-brand-ivory rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-brand-charcoal/40" />
                      </div>
                      <p className="text-brand-charcoal/70 font-medium">
                        No notifications
                      </p>
                      <p className="text-sm text-brand-charcoal/50 mt-1">
                        You're all caught up!
                      </p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-brand-gold/20 bg-brand-ivory/30">
                    <button className="w-full text-center text-sm text-brand-gold hover:text-brand-royal font-medium transition-colors duration-200">
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 text-brand-navy hover:bg-brand-ivory rounded-xl transition-all duration-200 group"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-brand-gold to-brand-royal rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-white text-sm font-semibold">
                  {dashboard.vendor?.user?.name?.charAt(0)?.toUpperCase() ||
                    "V"}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-brand-navy">
                  {dashboard.vendor?.user?.name || "Vendor"}
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
                        {dashboard.vendor?.user?.name
                          ?.charAt(0)
                          ?.toUpperCase() || "V"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        {dashboard.vendor?.user?.name || "Vendor"}
                      </p>
                      <p className="text-xs text-brand-charcoal/60">
                        {dashboard.vendor?.user?.email || "vendor@example.com"}
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
