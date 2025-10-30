import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";

// Components
import Sidebar from "./ClientPieces/Sidebar";
import Topbar from "./ClientPieces/Topbar";
import ProfileCard from "./ClientPieces/ProfileCard";
import ProfileModal from "./ClientPieces/ProfileModal";
import CategoryFilter from "./ClientPieces/CategoryFilter";
import MessagesSection from "./ClientPieces/MessagesSection";
import ClientPresence from "../Presence/clientPresence";

// Icons
import { Compass, Book, MessageCircle, User, CalendarDays } from "lucide-react";

export default function ClientLounge({
  user,
  bookmarkedProfiles,
  setBookmarkedProfiles,
}) {
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [viewMode, setViewMode] = useState("grid");
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const navigate = useNavigate();

  // 🧩 Helper — format API profiles
  const mapProfile = useCallback((item, type) => {
    const baseImageUrl = api.defaults.baseURL?.replace("/api/v1", "") || "";
    const imageUrl = item.profileImage
      ? `${baseImageUrl}/${item.profileImage.replace(/\\/g, "/")}`
      : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format";

    const base = {
      id: item._id,
      email: item.email,
      profileImage: imageUrl,
      location: `${item.city || item.state}, ${item.country || "Nigeria"}`,
      rating: item.rating || (Math.random() * 2 + 3).toFixed(1),
      verified: item.verified,
      type,
    };

    return type === "Vendor"
      ? {
          ...base,
          name: item.businessName,
          category: item.category,
          description: item.tagline,
          website: item.website,
          jobsCompleted: item.jobsCompleted || 0,
        }
      : {
          ...base,
          name: item.companyName,
          category: item.specialization?.join(", "),
          description: item.tagline,
          eventTypes: item.eventTypesHandled,
          languages: item.languagesSpoken,
        };
  }, []);

  // 🧠 Fetch vendor & planner profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const [vendors, planners] = await Promise.all([
          api.get("/vendor-profile/all"),
          api.get("/planner-profile/all"),
        ]);

        const vendorData = vendors.data?.data?.map((v) =>
          mapProfile(v, "Vendor")
        );
        const plannerData = planners.data?.data?.map((p) =>
          mapProfile(p, "Planner")
        );

        setProfiles([...(vendorData || []), ...(plannerData || [])]);
      } catch (err) {
        console.error("❌ Error fetching profiles:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [mapProfile]);

  // 💾 Fetch bookmarks exactly like ClientBookmark
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) {
        console.log("👤 No user logged in, clearing bookmarks");
        return setBookmarkedProfiles(new Set());
      }
      try {
        const { data } = await api.get("/bookmarks");
        console.log("📖 Bookmarks fetched:", data.data);

        if (data.success && data.data) {
          const bookmarkedIds = new Set(
            data.data.map((b) => b.targetId?._id).filter(Boolean)
          );
          console.log("⭐ Bookmarked profile IDs:", bookmarkedIds);
          setBookmarkedProfiles(bookmarkedIds);
        }
      } catch (err) {
        console.error("❌ Error fetching bookmarks:", err);
      }
    };

    fetchBookmarks();
  }, [user, setBookmarkedProfiles]);

  // 📅 Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      setBookingsLoading(true);
      try {
        const res = await api.get("/bookings");
        if (res.data.success) setBookings(res.data.data);
      } catch (err) {
        console.error("❌ Error fetching bookings:", err);
      } finally {
        setBookingsLoading(false);
      }
    };
    if (activeSection === "bookings") fetchBookings();
  }, [activeSection]);

  // ⚙️ Memoized bookmarks
  const bookmarkedProfilesList = useMemo(
    () => profiles.filter((p) => bookmarkedProfiles.has(p.id)),
    [profiles, bookmarkedProfiles]
  );

  // ⚙️ Filtered profiles
  const filteredProfiles = useMemo(() => {
    const activeList =
      activeSection === "saved" ? bookmarkedProfilesList : profiles;
    const searchLower = searchTerm.toLowerCase();

    return activeList.filter((profile) => {
      const matchesSearch =
        profile.name?.toLowerCase().includes(searchLower) ||
        profile.category?.toLowerCase().includes(searchLower) ||
        profile.location?.toLowerCase().includes(searchLower) ||
        profile.description?.toLowerCase().includes(searchLower);

      const matchesCategory =
        selectedCategory === "All" ||
        (selectedCategory === "Vendors" && profile.type === "Vendor") ||
        (selectedCategory === "Planners" && profile.type === "Planner");

      return matchesSearch && matchesCategory;
    });
  }, [
    profiles,
    searchTerm,
    selectedCategory,
    activeSection,
    bookmarkedProfilesList,
  ]);

  // 🩶 Bookmark toggle exactly like ClientBookmark
  const toggleBookmark = async (profile) => {
    if (!user) {
      console.log("🔒 User not authenticated, redirecting to login");
      navigate("/");
      return;
    }

    const { id, type } = profile;
    const isBookmarked = bookmarkedProfiles.has(id);
    const targetModel = type === "Vendor" ? "VendorProfile" : "PlannerProfile";

    console.log("📌 Toggling bookmark for:", profile.name, "ID:", id);

    setBookmarkLoading(id);
    try {
      // Optimistic UI update
      setBookmarkedProfiles((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.delete(id) : next.add(id);
        return next;
      });

      // API call
      if (isBookmarked) await api.delete(`/bookmarks/${id}`);
      else await api.post("/bookmarks", { targetId: id, targetModel });

      console.log(
        `✅ Bookmark ${isBookmarked ? "removed" : "added"} for ID:`,
        id
      );
    } catch (err) {
      console.error("❌ Error toggling bookmark:", err);
      // Rollback
      setBookmarkedProfiles((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.add(id) : next.delete(id);
        return next;
      });
    } finally {
      setBookmarkLoading(null);
    }
  };

  // 🧭 Sidebar Navigation
  const navItems = [
    {
      id: "overview",
      icon: <Compass size={20} />,
      label: "Overview",
      count: profiles.length,
    },
    {
      id: "saved",
      icon: <Book size={20} />,
      label: "Saved",
      count: bookmarkedProfiles.size,
    },
    { id: "bookings", icon: <CalendarDays size={20} />, label: "Bookings" },
    { id: "messages", icon: <MessageCircle size={20} />, label: "Messages" },
    { id: "profile", icon: <User size={20} />, label: "My Profile" },
  ];

  // 🎨 Dynamic content
  const renderContent = () => {
    if (activeSection === "profile") return <ClientPresence user={user} />;
    if (activeSection === "messages") return <MessagesSection />;
    if (activeSection === "bookings")
      return (
        <BookingsSection
          bookings={bookings}
          bookingsLoading={bookingsLoading}
        />
      );

    // Default (overview/saved)
    return (
      <div className="space-y-6">
        {activeSection === "overview" && (
          <CategoryFilter
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-x-brand-gold"></div>
              <p className="text-gray-500">Loading professionals...</p>
            </div>
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "flex flex-col space-y-4"
            }
          >
            {filteredProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                toggleBookmark={toggleBookmark}
                bookmarkLoading={bookmarkLoading}
                bookmarkedProfiles={bookmarkedProfiles}
                setSelectedProfile={setSelectedProfile}
                user={user}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              {activeSection === "saved"
                ? "No saved profiles yet"
                : "No profiles found"}
            </h3>
            <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
              {activeSection === "saved"
                ? "Start saving planners or vendors you like"
                : "Try a different search term or explore another category"}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-brand-royal-50/30">
      <Sidebar
        user={user}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        navItems={navItems}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <section className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </section>
      </main>

      <ProfileModal
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        toggleBookmark={toggleBookmark}
        bookmarkedProfiles={bookmarkedProfiles}
        bookmarkLoading={bookmarkLoading}
        navigate={navigate}
        user={user}
      />
    </div>
  );
}

// ✅ Bookings Section
function BookingsSection({ bookings, bookingsLoading }) {
  if (bookingsLoading)
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-x-brand-gold"></div>
      </div>
    );

  if (!bookings?.length)
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          No bookings yet
        </h2>
        <p className="text-gray-500">
          Once you make event bookings, they’ll appear here.
        </p>
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-navy mb-6">
        Your Bookings
      </h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-brand-ivory/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Vendor / Planner
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.map((b) => (
              <tr key={b._id || b.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800">
                  {b.eventType || "N/A"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {b.vendor?.businessName ||
                    b.planner?.companyName ||
                    "Unassigned"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(b.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      b.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : b.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
