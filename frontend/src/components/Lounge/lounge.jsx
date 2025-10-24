import React, { useState } from "react";
import useAuth from "../../hooks/useAuth"; 
import ClientLounge from "./clientLounge";
import VendorLounge from "./vendorLounge";
import PlannerLounge from "./plannerLounge";

function Lounge() {
  const { user, loading } = useAuth(); 
  const [bookmarkedProfiles, setBookmarkedProfiles] = useState(new Set());

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] text-gray-500 animate-pulse">
        Checking your profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] text-gray-500 animate-pulse">
        No user logged in. Please log in to continue.
      </div>
    );
  }

  return (
    <div className=" bg-gray-50">
      {/* ✅ Welcome Section */}
      <div className="text-center">
  
       

        {user.role === "client" }

        {user.role === "vendor" && (
          <p className="text-gray-600 max-w-2xl mx-auto mt-3 leading-relaxed">
            Showcase your craft. Connect with clients. Grow your brand.  
            Every booking brings you closer to excellence.
          </p>
        )}

        {user.role === "planner" && (
          <p className="text-gray-600 max-w-2xl mx-auto mt-3 leading-relaxed">
            Lead the magic behind every moment.  
            Coordinate. Inspire. Deliver events that make memories last.
          </p>
        )}
      </div>

      {/* ✅ Role-based Lounge Section */}
      <div className="mt-8 px-4">
        {user.role === "client" && (
          <ClientLounge
            user={user}
            bookmarkedProfiles={bookmarkedProfiles}
            setBookmarkedProfiles={setBookmarkedProfiles}
          />
        )}

        {user.role === "vendor" && <VendorLounge user={user} />}

        {user.role === "planner" && <PlannerLounge user={user} />}

        {!["client", "vendor", "planner"].includes(user.role) && (
          <div className="text-center text-gray-500 mt-20 italic">
            No valid role assigned. Please contact Eliteplan Support.
          </div>
        )}
      </div>
    </div>
  );
}

export default Lounge;
