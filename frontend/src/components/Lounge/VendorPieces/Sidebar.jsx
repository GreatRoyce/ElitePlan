import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/vendor/dashboard" },
  { name: "Bookings", icon: <CalendarDays size={20} />, path: "/vendor/bookings" },
  { name: "Orders", icon: <Package size={20} />, path: "/vendor/orders" },
  { name: "Notifications", icon: <Bell size={20} />, path: "/vendor/notifications" },
  { name: "Settings", icon: <Settings size={20} />, path: "/vendor/settings" },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside className="bg-brand-navy text-brand-ivory w-64 min-h-screen flex flex-col justify-between shadow-lg">
      {/* Logo Section */}
      <div>
        <div className="text-center py-6 text-2xl font-semibold border-b border-brand-gold tracking-wide">
          ElitePlan
        </div>

        {/* Menu Links */}
        <nav className="mt-6">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full text-left px-6 py-3 transition-all ${
                  isActive
                    ? "bg-brand-gold text-brand-navy font-semibold"
                    : "hover:bg-brand-charcoal/30"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="px-6 py-4 border-t border-brand-charcoal/40">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-brand-ivory hover:text-brand-gold transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
