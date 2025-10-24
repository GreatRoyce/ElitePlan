import React from "react";
import ClientSuite from "./clientSuite";
import VendorSuite from "./vendorSuite";
import PlannerSuite from "./plannerSuite";

function Suite({ user }) {
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const roleConfig = {
    client: {
      gradient: "from-blue-50 to-indigo-100",
      accent: "text-blue-600",
      badge: "bg-blue-100 text-blue-800",
      icon: "🎯",
      title: "Client Suite",
      description: "Your event planning command center",
    },
    vendor: {
      gradient: "from-emerald-50 to-green-100",
      accent: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
      icon: "🏢",
      title: "Vendor Hub",
      description: "Showcase your services and grow your business",
    },
    planner: {
      gradient: "from-purple-50 to-violet-100",
      accent: "text-purple-600",
      badge: "bg-purple-100 text-purple-800",
      icon: "📋",
      title: "Planner Workspace",
      description: "Coordinate events and manage client experiences",
    },
  };

  const config = roleConfig[user.role] || {
    gradient: "from-gray-50 to-gray-100",
    accent: "text-gray-600",
    badge: "bg-gray-100 text-gray-800",
    icon: "👤",
    title: "User Dashboard",
    description: "Your Eliteplan workspace",
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient}`}>

      
      {/* Enhanced Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            {/* Welcome & Role Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Welcome back,{" "}
                <span className={config.accent}>{user.username}</span>
              </h1>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${config.badge} backdrop-blur-sm border`}
              >
                {config.icon} {user.role?.toUpperCase()}
              </span>
            </div>

            {/* Main Description */}
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-6">
              Eliteplan is your ultimate platform for seamless event management.
              From discovering top professionals to tracking every detail of
              your events, everything you need is in one place.
            </p>

            {/* Role-specific Highlights */}
            <div className="max-w-2xl mx-auto">
              {user.role === "client" && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🎯 Your Client Benefits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-blue-600">🔍</span>
                      </div>
                      Discover trusted vendors
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-blue-600">💬</span>
                      </div>
                      Direct communication
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-blue-600">📊</span>
                      </div>
                      Track event progress
                    </div>
                  </div>
                </div>
              )}

              {user.role === "vendor" && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🚀 Vendor Opportunities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-emerald-600">⭐</span>
                      </div>
                      Showcase services
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-emerald-600">👥</span>
                      </div>
                      Connect with clients
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-emerald-600">📈</span>
                      </div>
                      Grow your business
                    </div>
                  </div>
                </div>
              )}

              {user.role === "planner" && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    ✨ Planner Tools
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-purple-600">🤝</span>
                      </div>
                      Coordinate vendors
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-purple-600">⚡</span>
                      </div>
                      Manage timelines
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-purple-600">💫</span>
                      </div>
                      Deliver excellence
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role-based Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="relative">
          {user.role === "client" && <ClientSuite user={user} />}
          {user.role === "vendor" && <VendorSuite user={user} />}
          {user.role === "planner" && <PlannerSuite user={user} />}

          {!["client", "vendor", "planner"].includes(user.role) && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">❓</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Role Configuration Needed
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Please contact Eliteplan Support to configure your account role
                and access your workspace.
              </p>
              <button className="mt-6 px-6 py-3 bg-brand-emerald text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors">
                Contact Support
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Suite;
