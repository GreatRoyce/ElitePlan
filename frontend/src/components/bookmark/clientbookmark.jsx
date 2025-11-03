import React, { useEffect, useState, useMemo } from "react";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";

function ClientBookmark({ user, bookmarkedProfiles, setBookmarkedProfiles }) {
  const [profiles, setProfiles] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // fetch bookmarks
  const fetchBookmarks = async () => {
    if (!user) {
      setBookmarkedProfiles(new Set());
      setProfiles([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/bookmarks/");
      
      if (!data?.success) throw new Error(data?.message || "Failed to fetch bookmarks");

      const bookmarks = Array.isArray(data.data) ? data.data : [];

      const bookmarkedIds = new Set(
        bookmarks
          .map(
            (b) =>
              b.targetId?._id ||
              (typeof b.targetId === "string" && b.targetId) ||
              null
          )
          .filter(Boolean)
      );
      setBookmarkedProfiles(bookmarkedIds);

      const derivedProfiles = bookmarks
        .map((b) => {
          const t = b.targetId || {};
          const id = t._id || t.id || b.targetId;
          const name =
            t.businessName || t.companyName || t.username || t.name || "Untitled";
          const type = b.targetModel === "VendorProfile" ? "Vendor" : "Planner";
          return { id, name, type, raw: t };
        })
        .filter((p) => p.id);

      setProfiles(derivedProfiles);
    } catch (err) {
      console.error("❌ Error fetching bookmarks:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // derived lists
  const bookmarkedProfilesList = useMemo(
    () => profiles.filter((p) => bookmarkedProfiles.has(p.id)),
    [profiles, bookmarkedProfiles]
  );

  const displayedProfiles = useMemo(
    () => (showBookmarks ? bookmarkedProfilesList : profiles),
    [showBookmarks, bookmarkedProfilesList, profiles]
  );

  const getTargetModelFromProfile = (profile) => {
    const normalizedType = String(profile?.type || "").toLowerCase();
    if (normalizedType === "vendor" || normalizedType === "vendors") return "VendorProfile";
    if (normalizedType === "planner" || normalizedType === "planners") return "PlannerProfile";
    if (profile?.raw?.businessName) return "VendorProfile";
    return null;
  };

  // toggle bookmark
  const toggleBookmark = async (profile) => {
    if (!user) {
      navigate("/");
      return;
    }

    const { id } = profile;
    const isBookmarked = bookmarkedProfiles.has(id);
    const targetModel = getTargetModelFromProfile(profile);

    if (!targetModel) {
      alert("Unable to determine profile type for bookmarking. Try again later.");
      return;
    }

    setBookmarkLoading(id);
    setError(null);

    try {
      if (isBookmarked) {
        await api.delete(`/bookmarks/${id}`);
      } else {
        await api.post("/bookmarks/", { targetId: id, targetModel });
      }
      await fetchBookmarks();
    } catch (err) {
      console.error("❌ Error toggling bookmark:", err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message || "Bookmark failed";
      setError(msg);
      if (status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/");
      } else {
        alert(msg);
      }
    } finally {
      setBookmarkLoading(null);
    }
  };

  const BookmarkButton = ({ profile }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleBookmark(profile);
      }}
      disabled={bookmarkLoading === profile.id}
      className={`z-10 w-8 h-8 bg-white/70 rounded-full flex items-center justify-center transition-all shadow-sm ${
        bookmarkLoading === profile.id
          ? "opacity-50 cursor-not-allowed"
          : "hover:scale-110"
      }`}
      aria-label={
        bookmarkedProfiles.has(profile.id) ? "Remove bookmark" : "Add bookmark"
      }
    >
      {bookmarkLoading === profile.id ? (
        <div className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg
          className={`w-4 h-4 ${
            bookmarkedProfiles.has(profile.id)
              ? "text-brand-gold fill-current"
              : "text-gray-400 hover:text-brand-gold"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      )}
    </button>
  );

  const BookmarkToggle = () => (
    <button
      onClick={() => setShowBookmarks((s) => !s)}
      className={`flex items-center gap-2 px-6 py-4 rounded-xl border font-medium transition-all duration-300 min-w-[140px] justify-center ${
        showBookmarks
          ? "bg-brand-gold text-white shadow-lg"
          : "bg-white/60 text-brand-charcoal border-gray-200 hover:border-brand-gold"
      }`}
    >
      <span>
        Bookmarks{" "}
        {bookmarkedProfiles.size > 0 && `(${bookmarkedProfiles.size})`}
      </span>
    </button>
  );

  return (
    <div className="bookmark-container">
      <div className="flex items-center justify-between mb-4">
        <BookmarkToggle />
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      <div className="profiles-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedProfiles.length === 0 && !loading && (
          <div className="p-6 rounded-lg bg-white border text-center">
            <p className="text-gray-600">
              {showBookmarks ? "No bookmarks yet." : "No profiles to show."}
            </p>
          </div>
        )}

        {displayedProfiles.map((profile) => (
          <div
            key={profile.id}
            className="profile-card p-4 bg-white rounded-lg shadow-sm flex items-start justify-between cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedProfile(profile)}
          >
            <div>
              <h3 className="font-semibold text-lg">{profile.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{profile.type}</p>
            </div>
            <div className="ml-4">
              <BookmarkButton profile={profile} />
            </div>
          </div>
        ))}
      </div>

      {/* ========================= MODAL ========================= */}
      {selectedProfile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-xl overflow-y-auto max-h-[90vh] p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-brand-charcoal">
                {selectedProfile.raw?.businessName ||
                  selectedProfile.raw?.companyName ||
                  selectedProfile.name}
              </h2>
              <p className="text-sm text-gray-500 capitalize">
                {selectedProfile.type}
              </p>
              {selectedProfile.raw?.tagline && (
                <p className="text-gray-700 italic mt-2">
                  “{selectedProfile.raw.tagline}”
                </p>
              )}
            </div>

            {/* Gallery */}
            {Array.isArray(selectedProfile.raw?.gallery) &&
              selectedProfile.raw.gallery.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2 text-brand-charcoal">
                    Gallery
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedProfile.raw.gallery.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Gallery"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Particulars */}
            <div className="space-y-2 text-sm">
              {selectedProfile.raw?.specialization && (
                <p>
                  <strong>Specialization:</strong>{" "}
                  {selectedProfile.raw.specialization}
                </p>
              )}
              {selectedProfile.raw?.category && (
                <p>
                  <strong>Category:</strong> {selectedProfile.raw.category}
                </p>
              )}
              {selectedProfile.raw?.location && (
                <p>
                  <strong>Location:</strong> {selectedProfile.raw.location}
                </p>
              )}
              {selectedProfile.raw?.shortBio && (
                <p>
                  <strong>Bio:</strong> {selectedProfile.raw.shortBio}
                </p>
              )}
              {selectedProfile.raw?.email && (
                <p>
                  <strong>Email:</strong> {selectedProfile.raw.email}
                </p>
              )}
              {selectedProfile.raw?.phone && (
                <p>
                  <strong>Phone:</strong> {selectedProfile.raw.phone}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => toggleBookmark(selectedProfile)}
                className="px-4 py-2 bg-brand-gold text-white rounded-lg"
              >
                {bookmarkedProfiles.has(selectedProfile.id)
                  ? "Remove Bookmark"
                  : "Add Bookmark"}
              </button>
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientBookmark;
