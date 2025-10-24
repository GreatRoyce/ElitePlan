import React from "react";
import ClientPresence from "./clientPresence";
import VendorPresence from "./vendorPresence";
import PlannerPresence from "./plannerPresence";


function Presence({ user }) {
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] text-gray-700">
        Loading user data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Greeting */}
      <div className="text-center py-10 border-b border-gray-200">
        <h1 className="text-3xl font-semibold mb-2 text-brand-navy">
          Welcome {user.username}!
        </h1>
        <p className="text-gray-600">
          Enjoy your session and explore your personalized lounge.
        </p>
      </div>

      {/* Role-based content */}
      <div className="mt-8">
        {user.role === "client" && <ClientPresence user={user} />}
        {user.role === "vendor" && <VendorPresence user={user} />}
        {user.role === "planner" && <PlannerPresence user={user} />}
        {!["client", "vendor", "planner"].includes(user.role) && (
          <div className="text-center text-gray-400 mt-20">
            No valid role assigned. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
}

export default Presence;
