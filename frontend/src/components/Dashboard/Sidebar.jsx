// src/components/Dashboard/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Home, Star, Briefcase, Calendar, Settings } from "lucide-react";

function Sidebar({ role }) {
  const commonLinks = [
    { to: "/lounge", label: "Home", icon: <Home size={18} /> },
    { to: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const roleLinks = {
    client: [
      { to: "/vendors", label: "Find Vendors", icon: <Briefcase size={18} /> },
      { to: "/bookmarks", label: "Bookmarks", icon: <Star size={18} /> },
    ],
    vendor: [
      { to: "/projects", label: "My Projects", icon: <Briefcase size={18} /> },
      { to: "/bookings", label: "Bookings", icon: <Calendar size={18} /> },
    ],
    planner: [
      { to: "/events", label: "Events", icon: <Calendar size={18} /> },
      { to: "/vendors", label: "Manage Vendors", icon: <Briefcase size={18} /> },
    ],
  };

  const links = [...(roleLinks[role] || []), ...commonLinks];

  return (
    <aside className="w-60 bg-white shadow-md border-r border-gray-200 flex flex-col">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-brand-navy">
          {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
        </h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 text-gray-700 hover:bg-brand-navy/10 rounded-lg px-3 py-2 transition"
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
