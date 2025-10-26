import React from "react";
import { Bell, User, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Topbar = ({ vendorName = "Vendor Name", notifications = [] }) => {
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="w-full bg-brand-ivory text-brand-navy shadow-md flex justify-between items-center px-6 py-3">
      {/* Left section — Page title */}
      <h1 className="text-xl font-semibold tracking-wide">Vendor Lounge</h1>

      {/* Right section — Notifications & Profile */}
      <div className="flex items-center gap-6">
        {/* 🔔 Notifications */}
        <div
          className="relative cursor-pointer"
          onClick={() => navigate("/vendor/notifications")}
        >
          <Bell size={22} className="hover:text-brand-gold transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-brand-gold text-brand-navy text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>

        {/* 👤 Vendor Profile Dropdown (simplified placeholder) */}
        <div
          className="flex items-center gap-2 bg-brand-navy text-brand-ivory px-3 py-2 rounded-full cursor-pointer hover:bg-brand-gold hover:text-brand-navy transition-all"
          onClick={() => navigate("/vendor/profile")}
        >
          <User size={18} />
          <span className="text-sm font-medium">{vendorName}</span>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
