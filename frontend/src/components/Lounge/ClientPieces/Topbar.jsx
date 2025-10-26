import React, { useState, useRef, useEffect } from "react";
import { Search, Grid, List, Bell } from "lucide-react";
import api from "../../../utils/axios"; // ✅ make sure this points to your configured axios instance

export default function Topbar({
  user,
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications from backend
  useEffect(() => {
    if (!showNotifications || !user) return;
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await api.get("/notifications");
        if (res.data.success) {
          setNotifications(res.data.data);
        }
      } catch (error) {
        console.error("❌ Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [showNotifications, user]);

  return (
    <header className="bg-white border-b border-gray-200 pb-4 pl-12 pr-8 flex items-center justify-between relative">
      {/* Search */}
      <div className="flex items-center bg-gray-100 rounded-lg px-4 py-3 w-96">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search vendors, planners..."
          className="ml-3 bg-transparent outline-none w-full text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-6">
        {/* Grid/List toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            className={`p-2 rounded transition ${
              viewMode === "grid"
                ? "bg-brand-navy text-white"
                : "text-gray-600 hover:text-brand-navy"
            }`}
            onClick={() => setViewMode("grid")}
          >
            <Grid size={20} />
          </button>
          <button
            className={`p-2 rounded transition ${
              viewMode === "list"
                ? "bg-brand-royal text-white"
                : "text-brand-navy hover:text-brand-royal"
            }`}
            onClick={() => setViewMode("list")}
          >
            <List size={20} />
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="relative text-gray-600 hover:text-brand-navy"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
            <Bell size={22} />
            {notifications.some((n) => !n.read) && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden z-50 animate-fade-in">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h4 className="font-semibold text-gray-800 text-sm">
                  Notifications
                </h4>
                <button
                  className="text-xs text-brand-navy hover:underline"
                  onClick={() => alert("Mark all as read (coming soon)")}
                >
                  Mark all read
                </button>
              </div>

              <ul className="max-h-60 overflow-y-auto">
                {loading ? (
                  <li className="px-4 py-6 text-center text-gray-500 text-sm">
                    Loading...
                  </li>
                ) : notifications.length > 0 ? (
                  notifications.map((note) => (
                    <li
                      key={note._id}
                      className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-gray-700 font-medium">
                        {note.title}
                      </p>
                      <p className="text-xs text-gray-500">{note.message}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-center text-gray-500 text-sm">
                    No new notifications
                  </li>
                )}
              </ul>

              <div className="p-3 text-center border-t border-gray-100">
                <button className="text-sm text-brand-royal hover:underline">
                  View all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-3">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="User Avatar"
              className="w-8 h-8 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-8 h-8 bg-brand-navy rounded-full flex items-center justify-center text-white font-medium">
              {(user?.username || user?.email)?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium text-brand-navy capitalize">
            {user?.username || "User"}
          </span>
        </div>
      </div>
    </header>
  );
}
