import React from "react";
import { X, Bookmark, Calendar } from "lucide-react";
import StarRating from "./StarRating";

export default function ProfileModal({
  selectedProfile,
  setSelectedProfile,
  toggleBookmark,
  bookmarkedProfiles,
  bookmarkLoading,
  navigate,
}) {
  if (!selectedProfile) return null;

  const isBookmarked = bookmarkedProfiles.has(selectedProfile.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-slideUp">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={selectedProfile.profileImage}
              alt={selectedProfile.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-brand-gold/60"
            />
            <div>
              <h2 className="text-2xl font-semibold text-brand-navy">
                {selectedProfile.name}
              </h2>
              <p className="text-brand-gold text-sm mt-1 capitalize">
                {selectedProfile.category}
              </p>
              <p className="text-gray-500 text-xs">{selectedProfile.location}</p>
            </div>
          </div>

          <button
            onClick={() => setSelectedProfile(null)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {selectedProfile.yearsExperience && (
              <div className="bg-brand-ivory p-4 rounded-xl text-center border border-gray-100">
                <div className="text-2xl font-bold text-brand-gold">
                  {selectedProfile.yearsExperience}+
                </div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
            )}
            <div className="bg-brand-ivory p-4 rounded-xl text-center border border-gray-100">
              <div className="text-2xl font-bold text-brand-emerald">
                {selectedProfile.rating || 4.5}
              </div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
            {selectedProfile.verified && (
              <div className="bg-brand-ivory p-4 rounded-xl text-center border border-gray-100">
                <div className="text-2xl font-bold text-brand-emerald">✓</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
            )}
          </div>

          {/* About Section */}
          {selectedProfile.description && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                About
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {selectedProfile.description}
              </p>
            </div>
          )}

          {/* Optional Sections */}
          {selectedProfile.languages && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                Languages
              </h3>
              <p className="text-gray-600">
                {Array.isArray(selectedProfile.languages)
                  ? selectedProfile.languages.join(", ")
                  : selectedProfile.languages}
              </p>
            </div>
          )}

          {selectedProfile.eventTypes && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                Event Types
              </h3>
              <p className="text-gray-600">
                {Array.isArray(selectedProfile.eventTypes)
                  ? selectedProfile.eventTypes.join(", ")
                  : selectedProfile.eventTypes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row justify-between gap-3 border-t border-gray-100">
            {/* Bookmark */}
            <button
              onClick={() => toggleBookmark(selectedProfile)}
              disabled={bookmarkLoading === selectedProfile.id}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border font-medium transition-all duration-300 ${
                isBookmarked
                  ? "bg-brand-gold text-white border-brand-gold hover:opacity-90"
                  : "bg-white text-brand-gold border-brand-gold hover:bg-brand-gold/10"
              }`}
            >
              <Bookmark
                size={18}
                className={isBookmarked ? "fill-white" : "fill-none"}
              />
              {isBookmarked ? "Bookmarked" : "Add Bookmark"}
            </button>

            {/* Consultation */}
            <button
              onClick={() => navigate("/consult")}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald/90 transition-all duration-300"
            >
              <Calendar size={18} />
              Request Consultation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
