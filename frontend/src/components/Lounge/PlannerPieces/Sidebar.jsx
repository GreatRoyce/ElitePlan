import React from "react";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  User,
  LogOut,
  X,
  Menu,
  Bell,
  Briefcase,
} from "lucide-react";

const Sidebar = ({
  companyName,
  user,
  counts,
  activeSection,
  setActiveSection,
  handleLogout,
  isLoggingOut,
  setIsMobileOpen,
  isMobileOpen, // Assuming isMobileOpen is passed from parent
}) => {
  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "events", label: "Events", icon: Calendar },
    { id: "requests", label: "Requests", icon: Bell, count: counts.requests },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      count: counts.messages,
    },
    { id: "profile", label: "Profile", icon: User },
  ];

  // Notifications button (footer area)
  const notificationsItem = {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    count: counts.notifications || 0,
  };

  const handleMenuItemClick = (itemId) => {
    setActiveSection(itemId);
    if (typeof setIsMobileOpen === "function") {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-brand-ivory rounded-lg shadow-md border border-brand-charcoal hover:shadow-lg transition-all duration-200"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-brand-charcoal" />
        ) : (
          <Menu className="w-5 h-5 text-brand-charcoal" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-brand-ivory border-r border-brand-charcoal/10 transform transition-all duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none
        ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-brand-charcoal/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-navy to-brand-gold rounded-xl flex items-center justify-center shadow-md">
              <Briefcase className="w-6 h-6 text-brand-ivory" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-navy">
                {companyName}
              </h1>
              <p className="text-sm text-brand-charcoal/80 font-medium">
                Planner Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuItemClick(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative group
                    ${
                      isActive
                        ? "bg-gradient-to-r from-brand-navy to-brand-royal text-brand-ivory shadow-lg"
                        : "text-brand-charcoal/80 hover:bg-brand-navy/10 hover:text-brand-navy"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isActive ? "scale-110" : "group-hover:scale-105"
                        }`}
                      />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span
                        className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
           <button
            onClick={() => handleMenuItemClick(notificationsItem.id)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
            ${
              activeSection === notificationsItem.id
                ? "bg-gradient-to-r from-brand-navy to-brand-royal text-brand-ivory shadow-lg"
                : "text-brand-charcoal/80 hover:bg-brand-navy/10 hover:text-brand-navy"
            }`}
          >
            <div className="flex items-center gap-3">
              <notificationsItem.icon className="w-5 h-5 transition-transform group-hover:scale-105" />
              <span className="font-medium text-sm">{notificationsItem.label}</span>
            </div>
            {notificationsItem.count > 0 && (
              <span
                className="text-xs font-bold rounded-full px-2 py-0.5 bg-red-500 text-white"
              >
                {notificationsItem.count}
              </span>
            )}
          </button>

        </nav>

        {/* Footer - Notifications + Logout */}
        <div className="p-4 border-t border-brand-charcoal/10 bg-brand-ivory/50 flex flex-col gap-2">
          {/* Notifications */}
         
          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group hover:shadow-md ${
              isLoggingOut
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "text-brand-charcoal/80 hover:bg-red-600/80 hover:text-white"
            }`}
          >
            {isLoggingOut ? (
              <>
                <div className="w-5 h-5 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin" />
                <span className="font-medium text-sm">Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5 transition-transform group-hover:scale-105" />
                <span className="font-medium text-sm">Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
