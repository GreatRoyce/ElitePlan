import React, { useEffect, useState, useMemo } from "react";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";

function ClientBookmark({ user, bookmarkedProfiles, setBookmarkedProfiles }) {
  const [profiles, setProfiles] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const navigate = useNavigate();

  // Fetch bookmarks on component mount
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (user) {
        try {
          console.log("📖 Fetching bookmarks for user:", user._id);
          const { data } = await api.get("/bookmarks/");
          console.log("✅ Bookmarks response:", data);

          if (data.success) {
            const bookmarkedIds = new Set(
              data.data.map((b) => b.targetId?._id).filter(Boolean)
            );
            console.log("⭐ Bookmarked profile IDs:", bookmarkedIds);
            setBookmarkedProfiles(bookmarkedIds);
          }
        } catch (err) {
          console.error("❌ Error fetching bookmarks:", err);
          console.error("Error details:", err.response?.data || err.message);
        }
      } else {
        console.log("👤 No user logged in, skipping bookmark fetch");
        setBookmarkedProfiles(new Set());
      }
    };
    fetchBookmarks();
  }, [user, setBookmarkedProfiles]);

  // Filter bookmarked profiles
  const bookmarkedProfilesList = useMemo(
    () => profiles.filter((p) => bookmarkedProfiles.has(p.id)),
    [profiles, bookmarkedProfiles]
  );

  // Profiles to display based on showBookmarks filter
  const displayedProfiles = useMemo(
    () => (showBookmarks ? bookmarkedProfilesList : profiles),
    [showBookmarks, bookmarkedProfilesList, profiles]
  );

  // Toggle bookmark function
  const toggleBookmark = async (profile) => {
    if (!user) {
      console.log("🔒 User not authenticated, redirecting to login");
      navigate("/");
      return;
    }

    console.log("📌 Toggling bookmark for:", profile.id);
    console.log("👤 Current user:", user._id);
    console.log("⭐ Currently bookmarked:", bookmarkedProfiles.has(profile.id));

    const { id, type } = profile;
    const isBookmarked = bookmarkedProfiles.has(id);
    const targetModel = type === "Vendor" ? "VendorProfile" : "PlannerProfile";

    setBookmarkLoading(id);

    try {
      if (isBookmarked) {
        console.log("🗑️ Removing bookmark...");
        const response = await api.delete(`/bookmarks/${id}`);
        console.log("✅ Bookmark removal response:", response.data);

        setBookmarkedProfiles((prev) => {
          const next = new Set(prev);
          next.delete(id);
          console.log("✅ Bookmark removed, new set:", next);
          return next;
        });
      } else {
        console.log("➕ Adding bookmark...");
        const response = await api.post("/bookmarks/", {
          target: id,
          targetModel,
        });
        console.log("✅ Bookmark addition response:", response.data);

        setBookmarkedProfiles((prev) => {
          const next = new Set(prev).add(id);
          console.log("✅ Bookmark added, new set:", next);
          return next;
        });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Session expired or not authenticated. Please log in again.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      console.error("❌ Error toggling bookmark:", err);
      console.error("Error details:", err.response?.data || err.message);
      alert("Failed to update bookmark. Please try again.");
    } finally {
      setBookmarkLoading(null);
    }
  };

  // Bookmark button component
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

  // Bookmark toggle button
  const BookmarkToggle = () => (
    <button
      onClick={() => setShowBookmarks(!showBookmarks)}
      className={`flex items-center gap-2 px-6 py-4 rounded-xl border font-medium transition-all duration-300 min-w-[140px] justify-center ${
        showBookmarks
          ? "bg-brand-gold text-white shadow-lg shadow-brand-gold/30"
          : "bg-white/60 text-brand-charcoal border-gray-200 hover:border-brand-gold hover:bg-amber-50"
      }`}
    >
      <svg
        className={`w-5 h-5 ${
          showBookmarks ? "text-white" : "text-brand-gold"
        }`}
        fill={showBookmarks ? "currentColor" : "none"}
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
      <span>
        Bookmarks{" "}
        {bookmarkedProfiles.size > 0 && `(${bookmarkedProfiles.size})`}
      </span>
    </button>
  );

  // Modal bookmark button
  const ModalBookmarkButton = ({ profile }) => {
    if (!user) {
      return (
        <button
          onClick={() => navigate("/")}
          className="block w-full text-center bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
        >
          Log in to Bookmark
        </button>
      );
    }

    if (bookmarkedProfiles.has(profile.id)) {
      return (
        <button
          onClick={() => toggleBookmark(profile)}
          disabled={bookmarkLoading === profile.id}
          className="block w-full text-center bg-green-100 text-green-800 border border-green-300 py-2.5 rounded-lg font-semibold hover:bg-green-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bookmarkLoading === profile.id ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-green-800 border-t-transparent rounded-full animate-spin"></div>
              Removing...
            </span>
          ) : (
            "✓ Bookmarked - Click to Remove"
          )}
        </button>
      );
    }

    return (
      <button
        onClick={() => toggleBookmark(profile)}
        disabled={bookmarkLoading === profile.id}
        className="block w-full text-center bg-transparent border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200/50 hover:border-gray-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {bookmarkLoading === profile.id ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
            Adding...
          </span>
        ) : (
          "Add to Bookmarks"
        )}
      </button>
    );
  };

  return (
    <div className="bookmark-container">
      {/* Bookmark toggle button */}
      <BookmarkToggle />

      {/* Display bookmark status */}
      <div className="bookmark-status">
        {showBookmarks ? "Showing bookmarks" : "Showing all profiles"}
        {bookmarkedProfiles.size > 0 && (
          <span className="bookmark-count">
            ({bookmarkedProfiles.size} bookmarked)
          </span>
        )}
      </div>

      {/* Profile cards with bookmark buttons */}
      <div className="profiles-grid">
        {displayedProfiles.map((profile) => (
          <div
            key={profile.id}
            className="profile-card"
            onClick={() => setSelectedProfile(profile)}
          >
            {/* Profile content would go here */}
            <div className="profile-header">
              <h3>{profile.name}</h3>
              <BookmarkButton profile={profile} />
            </div>
            {/* Rest of profile content */}
          </div>
        ))}
      </div>

      {/* Empty state for bookmarks */}
      {showBookmarks && bookmarkedProfilesList.length === 0 && (
        <div className="empty-state">
          <p>No bookmarks yet. Start bookmarking your favorite profiles!</p>
          {!user && <p>Please log in to bookmark profiles.</p>}
        </div>
      )}

      {/* Modal with bookmark button */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal content would go here */}
            <div className="modal-actions">
              <ModalBookmarkButton profile={selectedProfile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientBookmark;
