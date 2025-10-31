// Sidebar.jsx
import React from "react";
import {
  LayoutDashboard,
  Clock,
  MessageSquare,
  User,
  LogOut,
  X,
  Menu,
} from "lucide-react";

export default function Sidebar({
  activeSection,
  setActiveSection,
  handleLogout,
  isLoggingOut = false,
  isMobileOpen,
  setIsMobileOpen,
}) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pending", label: "Pending Requests", icon: Clock },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "profile", label: "My Profile", icon: User },
  ];

  const handleMenuItemClick = (itemId) => {
    setActiveSection(itemId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-brand.ivory rounded-lg shadow-md border border-brand.charcoal hover:shadow-lg transition-all duration-200"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-brand.charcoal" />
        ) : (
          <Menu className="w-5 h-5 text-brand.charcoal" />
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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-brand.ivory border-r border-brand.charcoal transform transition-all duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none
        ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-brand.charcoal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand.navy to-brand.gold rounded-xl flex items-center justify-center shadow-md">
              <span className="text-brand.ivory font-bold text-lg">V</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand.navy">VenueVendor</h1>
              <p className="text-sm text-brand.charcoal font-medium">
                Business Portal
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
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative group
                    ${
                      isActive
                        ? "bg-gradient-to-r from-brand.navy to-brand.gold text-brand.ivory shadow-lg"
                        : "text-brand.charcoal hover:bg-brand.ivory/20 hover:text-brand.navy hover:shadow-md"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-brand.ivory rounded-r-full" />
                    )}
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      }`}
                    />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-brand.charcoal bg-brand.ivory/50">
          <button
            onClick={() => handleLogout()}
            disabled={isLoggingOut}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group hover:shadow-md ${
              isLoggingOut
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "text-brand.charcoal hover:bg-brand.royal hover:text-brand.ivory"
            }`}
          >
            {isLoggingOut ? (
              <>
                <div className="w-5 h-5 border-2 border-brand.charcoal border-t-transparent rounded-full animate-spin" />
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
}