import React from "react";
import {
  ClipboardList,
  Users,
  MessageCircle,
  Settings,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";

const PlannerSuite = ({ user }) => {
  // Mock data - replace with API calls
  const activeProjects = [
    { id: 1, name: "John & Jane's Wedding", client: "John Doe", progress: 75 },
    {
      id: 2,
      name: "Innovate Summit 2024",
      client: "Tech Solutions Ltd.",
      progress: 40,
    },
    {
      id: 3,
      name: "Adebayo 50th Birthday",
      client: "Chief Adebayo",
      progress: 90,
    },
  ];
  const newInquiries = 3;
  const preferredVendors = 12;

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
          icon={ClipboardList}
          label="Active Projects"
          value={activeProjects.length}
          color="bg-purple-500"
        />
        <StatCard
          icon={MessageCircle}
          label="New Inquiries"
          value={newInquiries}
          color="bg-amber-500"
        />
        <StatCard
          icon={Users}
          label="Preferred Vendors"
          value={preferredVendors}
          color="bg-sky-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Projects */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            Active Projects
          </h3>
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-50 p-4 rounded-xl border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{project.name}</p>
                  <Link
                    to={`/projects/${project.id}`}
                    className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    Manage
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {project.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Workspace Tools
          </h3>
          <div className="space-y-3">
            <ActionLink
              to="/projects/new"
              icon={Plus}
              label="Create New Project"
            />
            <ActionLink to="/lounge" icon={Users} label="Find New Vendors" />
            <ActionLink
              to="/presence"
              icon={Settings}
              label="Update My Profile"
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
    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-white transition-all"
  >
    <Icon className="w-5 h-5 text-purple-600" />
    <span className="font-semibold text-gray-700">{label}</span>
  </Link>
);

export default PlannerSuite;
