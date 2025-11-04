import React from "react";
import { Search, Grid, List } from "lucide-react";
import api from "../../../utils/axios"; // ✅ make sure this points to your configured axios instance

export default function Topbar({
  user,
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
}) {
  return (
    <header className="bg-white border-b mt-16 border-gray-200 pb-4 pl-12 pr-8 flex items-center justify-between relative">
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
