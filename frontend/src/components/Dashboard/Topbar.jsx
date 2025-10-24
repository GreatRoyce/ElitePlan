// src/components/Dashboard/Topbar.jsx
import React from "react";
import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Topbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm border-b border-gray-200">
      <h1 className="text-lg font-semibold text-brand-navy">Eliteplan</h1>

      <div className="flex items-center gap-4">
        <button className="relative text-gray-600 hover:text-brand-navy">
          <Bell size={20} />
        </button>

        <span className="text-gray-700 font-medium">
          {user?.username || user?.email}
        </span>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
