// src/components/PlannerPieces/Sidebar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Inbox, MessageSquare, Bell, LogOut } from "lucide-react";

const menuItems = [
  { id: "overview", label: "Overview", icon: <CalendarDays size={18} /> },
  { id: "events", label: "Event Board", icon: <CalendarDays size={18} /> },
  { id: "requests", label: "Pending Requests", icon: <Inbox size={18} /> },
  { id: "messages", label: "Messages", icon: <MessageSquare size={18} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
];

export default function Sidebar({
  companyName = "ElitePlan",
  activeSection,
  setActiveSection,
  onLogout,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();       // optional custom logout logic
    navigate("/login");             // redirect to login page
  };

  return (
    <aside className="w-60 bg-brand-navy text-brand-ivory flex flex-col justify-between p-4 min-h-screen">
      
      {/* Company Name */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{companyName}</h1>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg text-left transition-colors duration-200 font-medium ${
              activeSection === item.id
                ? "bg-brand-gold text-brand-navy"
                : "hover:bg-brand-charcoal hover:text-brand-gold"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full p-3 text-brand-ivory hover:bg-red-600 hover:text-white rounded-lg transition-colors duration-200"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
