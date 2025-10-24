import React, { useEffect, useState, useMemo } from "react";
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
import { Compass, Book, MessageCircle, User } from "lucide-react";

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
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  const navigate = useNavigate();

  // Map profile helper
  const mapProfile = (item, type) => {
    const baseImageUrl = api.defaults.baseURL?.replace("/api/v1", "") || "";
    const imageUrl = item.profileImage
      ? `${baseImageUrl}/${item.profileImage.replace(/\\/g, "/")}`
      : `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format`;

    const baseProfile = {
      id: item._id,
      email: item.email,
      profileImage: imageUrl,
      yearsExperience: item.yearsExperience,
      state: item.state,
      country: item.country,
      location: `${item.city || item.state}, ${item.country}`,
      rating: item.rating || (Math.random() * 2 + 3).toFixed(1),
      verified: item.verified,
      type,
    };

    if (type === "Vendor") {
      return {
        ...baseProfile,
        name: item.businessName,
        category: item.category,
        description: item.description,
        city: item.city,
        website: item.website,
        jobsCompleted: item.jobsCompleted,
      };
    }

    if (type === "Planner") {
      return {
        ...baseProfile,
        name: item.companyName,
        category: item.specialization?.join(", "),
        description: item.shortBio,
        eventTypes: item.eventTypesHandled,
        languages: item.languagesSpoken,
      };
    }

    return baseProfile;
  };

  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const [vendorRes, plannerRes] = await Promise.all([
          api.get("/vendor-profile/all"),
          api.get("/planner-profile/all"),
        ]);

        const combined = [
          ...(vendorRes.data?.data || []).map((v) => mapProfile(v, "Vendor")),
          ...(plannerRes.data?.data || []).map((p) => mapProfile(p, "Planner")),
        ];

        setProfiles(combined);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // Fetch bookmarks
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return setBookmarkedProfiles(new Set());

      try {
        const { data } = await api.get("/bookmarks/");
        if (data.success) {
          const bookmarkedIds = new Set(
            data.data.map((b) => b.targetId?._id).filter(Boolean)
          );
          setBookmarkedProfiles(bookmarkedIds);
        }
      } catch (err) {
        console.error("Error fetching bookmarks:", err);
      }
    };
    fetchBookmarks();
  }, [user, setBookmarkedProfiles]);

  // Memoized data transformations
  const bookmarkedProfilesList = useMemo(
    () => profiles.filter((p) => bookmarkedProfiles.has(p.id)),
    [profiles, bookmarkedProfiles]
  );

  const filteredProfiles = useMemo(() => {
    const base = activeSection === "saved" ? bookmarkedProfilesList : profiles;
    const searchLower = searchTerm.toLowerCase();

    return base.filter((profile) => {
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

  // Toggle bookmark
  const toggleBookmark = async (profile) => {
    if (!user) return;

    const { id, type } = profile;
    const isBookmarked = bookmarkedProfiles.has(id);
    const targetModel = type === "Vendor" ? "VendorProfile" : "PlannerProfile";

    setBookmarkLoading(id);

    try {
      setBookmarkedProfiles((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.delete(id) : next.add(id);
        return next;
      });

      if (isBookmarked) await api.delete(`/bookmarks/${id}`);
      else await api.post("/bookmarks/", { targetId: id, targetModel });
    } catch (err) {
      // revert
      setBookmarkedProfiles((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.add(id) : next.delete(id);
        return next;
      });
      console.error("Error toggling bookmark:", err);
    } finally {
      setBookmarkLoading(null);
    }
  };

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
    { id: "messages", icon: <MessageCircle size={20} />, label: "Messages" },
    { id: "profile", icon: <User size={20} />, label: "My Profile" },
  ];

  const renderContent = () => {
    if (activeSection === "profile") return <ClientPresence user={user} />;
    if (activeSection === "messages") return <MessagesSection />;

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
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 auto-rows-fr"
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
                ? "Start saving professionals you like"
                : "Try adjusting search terms or explore different categories"}
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
