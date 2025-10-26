import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";
import ClientLounge from "./clientLounge";
import VendorLounge from "./vendorLounge";
import PlannerLounge from "./plannerLounge";

function Lounge() {
  const { user, loading } = useAuth();
  const [bookmarkedProfiles, setBookmarkedProfiles] = useState(new Set());

  // 🔄 While loading, show a neutral spinner-like placeholder (no text)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  // 🚫 If not logged in, show nothing (you can redirect instead if needed)
  if (!user) return null;

  // ✅ Load appropriate lounge directly
  return (
    <div className="bg-gray-50 min-h-screen">
      {user.role === "client" && (
        <ClientLounge
          user={user}
          bookmarkedProfiles={bookmarkedProfiles}
          setBookmarkedProfiles={setBookmarkedProfiles}
        />
      )}
      {user.role === "vendor" && <VendorLounge user={user} />}
      {user.role === "planner" && <PlannerLounge user={user} />}
    </div>
  );
}

export default Lounge;
