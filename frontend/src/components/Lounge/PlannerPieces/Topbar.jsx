import React, { useState, useRef, useEffect } from "react";
import { FaBell } from "react-icons/fa";

export default function Topbar({ companyName, notifications = [], toggleSidebar }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-20">
      {/* Left: Company name and mobile toggle */}
      <div className="flex items-center space-x-4">
        <button
          className="md:hidden p-2 bg-brand-navy text-brand-ivory rounded"
          onClick={toggleSidebar}
        >
          ☰
        </button>
        <h1 className="text-xl font-bold text-brand-navy">
          {companyName} — Planner Lounge
        </h1>
      </div>

      {/* Right: Notifications */}
      <div className="relative">
        <button
          className="relative p-2 text-brand-navy rounded hover:bg-gray-100"
          onClick={() => setOpen(!open)}
        >
          <FaBell className="text-xl" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {notifications.length}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-lg rounded-xl z-50 overflow-hidden"
          >
            <div className="p-4 text-sm font-semibold border-b border-gray-100">
              Notifications
            </div>
            {notifications.length ? (
              <ul className="max-h-64 overflow-y-auto">
                {notifications.map((n, idx) => (
                  <li
                    key={idx}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center space-x-2"
                  >
                    <FaBell className="text-brand-gold" />
                    <span className="text-gray-700">{n.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-gray-500 text-sm text-center">
                No notifications yet
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
