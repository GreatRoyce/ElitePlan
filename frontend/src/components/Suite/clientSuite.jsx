import React from "react";
import {
  Calendar,
  Bookmark,
  MessageSquare,
  Settings,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";

const ClientSuite = ({ user }) => {
  // Mock data - replace with API calls
  const upcomingEvents = [
    { id: 1, name: "My Wedding", date: "2024-12-15", planner: "Luxe Planners" },
    {
      id: 2,
      name: "End of Year Party",
      date: "2024-12-28",
      planner: "Corporate Events Inc.",
    },
  ];
  const bookmarkedProfessionals = 5;
  const unreadMessages = 2;

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-5">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Calendar}
          label="Upcoming Events"
          value={upcomingEvents.length}
          color="bg-blue-500"
        />
        <StatCard
          icon={Bookmark}
          label="Bookmarked"
          value={bookmarkedProfessionals}
          color="bg-purple-500"
        />
        <StatCard
          icon={MessageSquare}
          label="Unread Messages"
          value={unreadMessages}
          color="bg-emerald-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            My Upcoming Events
          </h3>
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800">{event.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  to={`/events/${event.id}`}
                  className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
            <button className="w-full mt-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Plan a New Event
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <ActionLink
              to="/lounge"
              icon={Bookmark}
              label="Browse Professionals"
            />
            <ActionLink
              to="/messages"
              icon={MessageSquare}
              label="View Messages"
            />
            <ActionLink
              to="/presence"
              icon={Settings}
              label="Edit My Profile"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionLink = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-white transition-all"
  >
    <Icon className="w-5 h-5 text-blue-600" />
    <span className="font-semibold text-gray-700">{label}</span>
  </Link>
);

export default ClientSuite;
