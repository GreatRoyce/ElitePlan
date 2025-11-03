import React from "react";
import { Bookmark } from "lucide-react";
import squeeze from "../../../assets/squeeze.png";


export default function ProfileCard({
  profile,
  toggleBookmark,
  bookmarkedProfiles,
  bookmarkLoading,
  setSelectedProfile,
  viewMode,
}) {
  const isBookmarked = bookmarkedProfiles.has(profile.id);

  return (
    <div style={{backgroundImage: `url(${squeeze})`}}
      onClick={() => setSelectedProfile(profile)} // ✅ Opens modal with details
      className={`group relative cursor-pointer rounded-2xl shadow-sm hover:shadow-md  border border-gray-100 transition-all duration-300 overflow-hidden bg-cover bg-no-repeat bg-white/30 ${
        viewMode === "list" ? "flex items-center p-4 space-x-4" : "p-5"
      }`}
    >
      {/* Profile Image */}
      <div
        className={`${
          viewMode === "list" ? "flex-shrink-0" : "flex justify-center"
        }`}
      >
        <img
          src={profile.profileImage}
          alt={profile.name}
          className={`object-cover rounded-full border-4 border-brand-gold/40 ${
            viewMode === "list"
              ? "w-20 h-20"
              : "w-28 h-28 mx-auto group-hover:scale-105 transition-transform duration-300"
          }`}
        />
      </div>

      {/* Info Section */}
      <div
        className={`${
          viewMode === "list" ? "flex-1" : "text-center mt-4"
        } space-y-1`}
      >
        <h3 className="font-semibold text-gray-900 capitalize">
          {profile.name}
        </h3>
        <p className="text-[12px] font-semibold text-gray-700">{profile.category}</p>
        <p className="text-xs p-2">{profile.shortBio || profile.description}</p>
        <div className="flex items-center justify-center gap-2 mt-1 text-xs text-gray-500">
          {profile.yearsExperience && (
            <span>{profile.yearsExperience} yrs exp</span>
          )}
          <div className="flex justify-between space-x-10">

          <p className="text-xs  text-gray-900">{profile.location}</p>
          <span>⭐ {profile.rating}</span>
          </div>
        </div>
      </div>

      {/* Bookmark button */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // ✅ prevent modal from opening when clicking bookmark
          toggleBookmark(profile);
        }}
        disabled={bookmarkLoading === profile.id}
        className={`absolute top-3 right-3 p-2 rounded-full border transition-all duration-300 ${
          isBookmarked
            ? "bg-brand-gold text-white border-brand-gold"
            : "bg-white text-brand-gold border-brand-gold hover:bg-brand-gold/10"
        }`}
      >
        <Bookmark
          size={18}
          className={isBookmarked ? "fill-white" : "fill-none"}
        />
      </button>
    </div>
  );
}
