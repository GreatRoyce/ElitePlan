import React from "react";
import { BarChart3, Briefcase, Mail, UserCheck, Edit } from "lucide-react";
import { Link } from "react-router-dom";

const VendorSuite = ({ user }) => {
  // Mock data - replace with API calls
  const stats = {
    profileViews: 1250,
    newLeads: 15,
    upcomingJobs: 4,
    rating: 4.8,
  };
  const recentLeads = [
    { id: 1, clientName: "Ada Eze", eventType: "Wedding", date: "2024-11-20" },
    {
      id: 2,
      clientName: "TechCorp Inc.",
      eventType: "Corporate Event",
      date: "2024-10-05",
    },
    {
      id: 3,
      clientName: "Bisi Adebayo",
      eventType: "Birthday Party",
      date: "2024-12-01",
    },
  ];

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BarChart3}
          label="Profile Views (30d)"
          value={stats.profileViews}
          color="text-blue-500"
        />
        <StatCard
          icon={Mail}
          label="New Leads"
          value={stats.newLeads}
          color="text-emerald-500"
        />
        <StatCard
          icon={Briefcase}
          label="Upcoming Jobs"
          value={stats.upcomingJobs}
          color="text-purple-500"
        />
        <StatCard
          icon={UserCheck}
          label="Overall Rating"
          value={stats.rating.toFixed(1)}
          color="text-amber-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            Recent Leads & Inquiries
          </h3>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {lead.clientName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lead.eventType} -{" "}
                    {new Date(lead.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/leads/${lead.id}`}
                    className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    View
                  </Link>
                  <button className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Actions */}
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Your Business Profile
          </h3>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-xl border text-center">
              <p className="text-sm text-gray-500">Profile Completion</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full"
                  style={{ width: "85%" }}
                ></div>
              </div>
              <p className="text-sm font-bold text-emerald-600">85% Complete</p>
            </div>
            <ActionLink
              to="/presence"
              icon={Edit}
              label="Edit Public Profile"
            />
            <ActionLink
              to="/suite/analytics"
              icon={BarChart3}
              label="View Analytics"
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
    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-white transition-all"
  >
    <Icon className="w-5 h-5 text-emerald-600" />
    <span className="font-semibold text-gray-700">{label}</span>
  </Link>
);

export default VendorSuite;
