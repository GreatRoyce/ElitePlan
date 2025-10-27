import React from "react";
import { Users } from "lucide-react";

export default function ProfileHeader({ galleryCount = 0 }) {
  return (
    <div className="bg-brand-navy text-white px-8 py-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planner Profile</h1>
        <p className="text-sm text-brand-gold mt-1">Build your profile to attract more clients</p>
      </div>
      <div className="flex items-center gap-2 text-sm bg-white/10 px-4 py-2 rounded-full">
        <Users size={16} />
        <span>{galleryCount} Gallery Items</span>
      </div>
    </div>
  );
}
