import React, { useState } from "react";
import { X, Bookmark, Calendar, Image, ZoomIn } from "lucide-react";
import StarRating from "./StarRating";

export default function ProfileModal({
  selectedProfile,
  setSelectedProfile,
  toggleBookmark,
  bookmarkedProfiles,
  bookmarkLoading,
  navigate,
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState({});

  if (!selectedProfile) return null;

  const p = selectedProfile;
  const isBookmarked = bookmarkedProfiles.has(p.id);

  console.log("🟢 Selected Profile Data:", selectedProfile);

  // Image handling
  const handleImageLoad = (index) => {
    setImageLoading((prev) => ({ ...prev, [index]: false }));
  };

  const handleImageClick = (img, index) => {
    setSelectedImage({ src: img, index });
  };

  const navigateGallery = (direction) => {
    if (!selectedImage || !p.gallery) return;
    const currentIndex = selectedImage.index;
    const newIndex =
      direction === "next"
        ? (currentIndex + 1) % p.gallery.length
        : (currentIndex - 1 + p.gallery.length) % p.gallery.length;
    setSelectedImage({ src: p.gallery[newIndex], index: newIndex });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) setSelectedImage(null);
  };

  // Consultation handling
  const handleRequestConsultation = () => {
    // Use p.id or fallback to p.raw._id if present
    const targetUserId = p.id || p.raw?._id;

    if (!targetUserId) {
      console.warn("No valid ID found for this profile!");
      return;
    }

    const targetType = p.type === "Vendor" ? "Vendor" : "Planner";

    console.log("🟢 Requesting consultation:", { targetUserId, targetType });

    navigate("/consult", {
      state: { targetUserId, targetType },
    });
  };

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-slideUp">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={p.profileImage || "/placeholder.jpg"}
                alt={p.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-brand-gold/60"
              />
              <div>
                <h2 className="text-2xl font-semibold text-brand-navy">
                  {p.name}
                </h2>
                {(p.description || p.tagline) && (
                  <p className="text-gray-600 italic text-sm mt-1">
                    "{p.description || p.tagline}"
                  </p>
                )}
                {p.category && (
                  <p className="text-brand-gold text-sm mt-1 capitalize">
                    {p.category.split(",")[0]}
                  </p>
                )}
                {p.location && (
                  <p className="text-gray-500 text-xs mt-1">{p.location}</p>
                )}
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
              {(p.yearsExperience || 0) > 0 && (
                <div className="bg-brand-ivory p-4 rounded-xl text-center border border-gray-100">
                  <div className="text-2xl font-bold text-brand-gold">
                    {p.yearsExperience}+
                  </div>
                  <div className="text-sm text-gray-600">Years Experience</div>
                </div>
              )}
              <div className="bg-brand-ivory p-4 rounded-xl text-center border border-gray-100">
                <div className="text-2xl font-bold text-brand-emerald">
                  {p.rating || "-"}
                </div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              {p.verified && (
                <div className="bg-brand-ivory p-4 rounded-xl text-center border border-gray-100">
                  <div className="text-2xl font-bold text-brand-emerald">✓</div>
                  <div className="text-sm text-gray-600">Verified</div>
                </div>
              )}
            </div>

            {/* About */}
            {p.shortBio && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                  About
                </h3>
                <p className="text-gray-600 leading-relaxed">{p.shortBio}</p>
              </div>
            )}

            {/* Specialization / Category / Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {p.specialization && (
                <p>
                  <strong>Specialization:</strong> {p.specialization}
                </p>
              )}
              {p.category && (
                <p>
                  <strong>Category:</strong> {p.category}
                </p>
              )}
              {p.email && (
                <p>
                  <strong>Email:</strong> {p.email}
                </p>
              )}
              {p.phone && (
                <p>
                  <strong>Phone:</strong> {p.phone}
                </p>
              )}
            </div>

            {/* Languages */}
            {p.languages && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                  Languages
                </h3>
                <p>
                  {Array.isArray(p.languages)
                    ? p.languages.join(", ")
                    : p.languages}
                </p>
              </div>
            )}

            {/* Event Types */}
            {p.eventTypes && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                  Event Types
                </h3>
                <p>
                  {Array.isArray(p.eventTypes)
                    ? p.eventTypes.join(", ")
                    : p.eventTypes}
                </p>
              </div>
            )}

            {/* Gallery */}
            {Array.isArray(p.gallery) && p.gallery.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-lg flex items-center gap-2">
                  <Image size={18} /> Gallery ({p.gallery.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {p.gallery.map((img, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                      onClick={() => handleImageClick(img, index)}
                    >
                      <div className="aspect-square w-full relative">
                        {imageLoading[index] !== false && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <img
                          src={img}
                          alt={`Gallery ${index + 1}`}
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            imageLoading[index] !== false
                              ? "opacity-0"
                              : "opacity-100"
                          }`}
                          onLoad={() => handleImageLoad(index)}
                          onError={() => handleImageLoad(index)}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                        <ZoomIn
                          size={24}
                          className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between gap-3 border-t border-gray-100">
              <button
                onClick={() => toggleBookmark(p)}
                disabled={bookmarkLoading === p.id}
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

              <button
                onClick={handleRequestConsultation}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald/90 transition-all duration-300"
              >
                <Calendar size={18} />
                Request Consultation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={handleBackdropClick}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-300"
            >
              <X size={24} />
            </button>

            {p.gallery && p.gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateGallery("prev");
                  }}
                  className="absolute left-4 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-300 transform hover:scale-110"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateGallery("next");
                  }}
                  className="absolute right-4 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-300 transform hover:scale-110"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}

            {p.gallery && p.gallery.length > 1 && (
              <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                {selectedImage.index + 1} / {p.gallery.length}
              </div>
            )}

            <img
              src={selectedImage.src}
              alt={`Gallery image ${selectedImage.index + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg animate-scaleIn"
            />
          </div>
        </div>
      )}
    </>
  );
}
