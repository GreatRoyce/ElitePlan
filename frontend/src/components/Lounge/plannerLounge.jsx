import React, { useState } from "react";
import Sidebar from "../Lounge/ClientPieces/Sidebar";
import Topbar from "../Lounge/ClientPieces/Topbar";
import {
  Clock,
  Calendar,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  ArrowUpRight,
  Bell,
} from "lucide-react";

export default function PlannerLounge() {
  const [activeSection, setActiveSection] = useState("overview");

  const navItems = [
    { id: "overview", label: "Overview", icon: <TrendingUp /> },
    { id: "events", label: "Events", icon: <Calendar /> },
    { id: "clients", label: "Clients", icon: <Users /> },
    { id: "messages", label: "Messages", icon: <MessageSquare /> },
    { id: "reports", label: "Reports", icon: <FileText /> },
  ];

  const pipelineData = {
    pendingRequests: 12,
    bookedEvents: 8,
    ongoingEvents: 5,
    totalEventsHandled: 156,
    upcomingDeadlines: 3,
    unreadMessages: 7,
    pendingApprovals: 4,
    conversionRate: "68%",
    revenue: "₦4.2M",
  };

  const upcomingEvents = [
    { id: 1, name: "Adebola Wedding", date: "2024-12-15", time: "14:00", status: "final meeting" },
    { id: 2, name: "Corporate Launch", date: "2024-12-18", time: "10:00", status: "venue walkthrough" },
    { id: 3, name: "Birthday Celebration", date: "2024-12-20", time: "18:00", status: "vendor confirmation" },
  ];

  const notifications = [
    { id: 1, content: "New message from Chioma", time: "5 min ago", unread: true },
    { id: 2, content: "Venue deposit requires approval", time: "1 hour ago", unread: true },
    { id: 3, content: "Follow up with catering vendor", time: "2 hours ago", unread: false },
  ];

  return (
    <div className="flex h-screen bg-brand-ivory text-brand-navy">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        navItems={navItems}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <Topbar title="Planner Lounge" />

        {/* Scrollable Main Section */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gradient-to-br from-brand-ivory to-brand-ivory/60">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-brand-navy">Planner’s Dashboard</h1>
            <p className="text-brand-charcoal mt-1">
              Oversee your events, deadlines, and client interactions at a glance.
            </p>
          </div>

          {/* ====== Main Grid ====== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT SIDE */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <OverviewCard
                  icon={<Clock className="text-brand-gold" />}
                  title="Pending Requests"
                  value={pipelineData.pendingRequests}
                  desc="Awaiting planner review"
                  color="gold"
                />
                <OverviewCard
                  icon={<CheckCircle className="text-brand-emerald" />}
                  title="Booked Events"
                  value={pipelineData.bookedEvents}
                  desc="Confirmed by clients"
                  color="emerald"
                />
                <OverviewCard
                  icon={<TrendingUp className="text-brand-navy" />}
                  title="Ongoing Events"
                  value={pipelineData.ongoingEvents}
                  desc="Currently active"
                  color="navy"
                />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard color="navy" icon={<Users />} title="Total Events" value={pipelineData.totalEventsHandled} />
                <StatCard color="gold" icon={<Calendar />} title="Upcoming" value={pipelineData.upcomingDeadlines} />
                <StatCard color="emerald" icon={<FileText />} title="Approvals" value={pipelineData.pendingApprovals} />
                <StatCard color="royal" icon={<MessageSquare />} title="Messages" value={pipelineData.unreadMessages} />
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-8">
              {/* Notifications */}
              <div className="bg-white border border-brand-ivory rounded-2xl p-6 shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-brand-navy flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-brand-navy" /> Notifications
                  </h3>
                  <span className="text-xs font-medium bg-brand-gold text-brand-navy px-2 py-1 rounded-full">
                    {notifications.filter((n) => n.unread).length} new
                  </span>
                </div>
                <div className="space-y-3">
                  {notifications.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg border ${
                        note.unread
                          ? "bg-brand-ivory border-brand-gold"
                          : "bg-white border-gray-100"
                      }`}
                    >
                      <p className="text-sm font-medium text-brand-navy">{note.content}</p>
                      <p className="text-xs text-brand-charcoal mt-1">{note.time}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-white border border-brand-ivory rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-brand-gold" /> Upcoming Deadlines
                </h3>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 bg-brand-ivory rounded-lg border border-brand-gold flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-brand-navy text-sm">{event.name}</p>
                        <p className="text-xs text-brand-charcoal">
                          {new Date(event.date).toLocaleDateString()} • {event.time}
                        </p>
                      </div>
                      <span className="text-xs font-semibold bg-brand-gold text-brand-navy px-2 py-1 rounded-full">
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* -------------------- COMPONENTS -------------------- */

const OverviewCard = ({ icon, title, value, desc, color }) => {
  const borderColor = {
    gold: "border-brand-gold",
    emerald: "border-brand-emerald",
    navy: "border-brand-navy",
  }[color];

  return (
    <div
      className={`bg-white border-l-4 ${borderColor} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="p-2 bg-brand-ivory rounded-lg">{icon}</div>
        <span className="text-2xl font-bold text-brand-navy">{value}</span>
      </div>
      <h3 className="font-semibold text-brand-navy">{title}</h3>
      <p className="text-sm text-brand-charcoal">{desc}</p>
      <button className="mt-2 text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors flex items-center">
        View details <ArrowUpRight className="w-4 h-4 ml-1" />
      </button>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  const bgColors = {
    navy: "bg-brand-navy text-brand-ivory",
    gold: "bg-brand-gold text-brand-navy",
    emerald: "bg-brand-emerald text-white",
    royal: "bg-brand-royal text-white",
  }[color];

  return (
    <div className={`rounded-xl p-4 shadow-md ${bgColors}`}>
      <div className="mb-2">{icon}</div>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
