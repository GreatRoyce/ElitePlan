// src/components/PlannerPieces/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Inbox,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  Building2,
  Sparkles,
} from "lucide-react";
import api from "../../../utils/axios";
import elite from "../../../assets/elite.png"; // Adjust path as needed

export default function Sidebar({
  companyName = <img src={elite} alt="" className="h-8" />,
  user: userProp,
  activeSection,
  setActiveSection,
  onLogout,
  counts = {}, // { requests, messages, notifications }
}) {
  const [user, setUser] = useState(userProp || { username: "Planner" });
  const [loading, setLoading] = useState(!userProp);
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch user data if not provided
  useEffect(() => {
    const fetchUserData = async () => {
      if (userProp) {
        setUser(userProp);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get("/auth/me"); // Adjust endpoint as needed
        setUser(response.data.data || response.data.user);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // Fallback to localStorage or default
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userProp]);

  // Store user data when it changes
  useEffect(() => {
    if (user && user !== userProp) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user, userProp]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/");
  };

  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    if (window.innerWidth < 768) setIsOpen(false); // close mobile sidebar
  };

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (window.innerWidth < 768) setIsOpen(false);
  }, [location.pathname]);

  const menuSections = [
    {
      title: "MAIN",
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: <Sparkles size={20} />,
          badge: null,
        },
        {
          id: "events",
          label: "Event Board",
          icon: <CalendarDays size={20} />,
          badge: null,
        },
      ],
    },
    {
      title: "COMMUNICATIONS",
      items: [
        {
          id: "requests",
          label: "Pending Requests",
          icon: <Inbox size={20} />,
          badge: counts.requests || null,
        },
        {
          id: "messages",
          label: "Messages",
          icon: <MessageSquare size={20} />,
          badge: counts.messages || null,
        },
        {
          id: "notifications",
          label: "Notifications",
          icon: <Bell size={20} />,
          badge: counts.notifications || null,
        },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        {
          id: "profile",
          label: "My Profile",
          icon: <User size={20} />,
          badge: null,
        },
      ],
    },
  ];

  const getUserDisplayName = () => {
    if (loading) return "Loading...";
    return user?.username || user?.name || user?.firstName || "Planner";
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-brand-navy text-brand-gold rounded-lg shadow-lg hover:bg-brand-charcoal transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen bg-gradient-to-b from-brand-navy to-brand-charcoal text-brand-ivory flex flex-col transition-all duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          isCollapsed ? "w-20" : "w-64"
        } shadow-xl border-r border-brand-gold/20`}
      >
        {/* Header */}
        <div className="p-4 border-b border-brand-gold/20">
          <div
            className={`flex items-center justify-between ${
              isCollapsed ? "flex-col space-y-2" : "flex-row"
            }`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "flex-col space-y-2" : "space-x-3"
              }`}
            >
              <div className="p-2 bg-brand-gold rounded-lg">
                <Building2
                  className="text-brand-navy"
                  size={isCollapsed ? 20 : 24}
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <img
                    src={elite}
                    alt=""
                    className="flex items-center h-14 w-22"
                  ></img>
                </div>
              )}
            </div>

            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 hover:bg-brand-gold/20 rounded-lg transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-brand-gold/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-gold rounded-full flex items-center justify-center">
                <User className="text-brand-navy" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate capitalize">
                  @{getUserDisplayName()}
                </p>
                <p className="text-xs text-brand-ivory/60 truncate">
                  {loading ? "Loading..." : "Welcome back!"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <div className="px-4 mb-2">
                  <p className="text-xs font-semibold text-brand-gold/60 uppercase tracking-wider">
                    {section.title}
                  </p>
                </div>
              )}

              <div className="space-y-1 px-2">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 group ${
                      activeSection === item.id
                        ? "bg-brand-gold text-brand-navy shadow-lg"
                        : "hover:bg-brand-gold/10 hover:text-brand-gold text-brand-ivory/80"
                    } ${
                      isCollapsed ? "justify-center" : "justify-start space-x-3"
                    }`}
                    title={isCollapsed ? item.label : ""}
                  >
                    <div className="relative">
                      {item.icon}
                      {item.badge && (
                        <span
                          className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center ${
                            isCollapsed ? "px-1" : "px-1.5"
                          }`}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <>
                        <span className="font-medium flex-1 text-left">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-brand-gold/20">
  <button
    onClick={() => {
      // Show logging out message
      const button = event.target;
      const originalContent = button.innerHTML;
      
      button.innerHTML = `
        <div class="flex items-center ${isCollapsed ? "justify-center" : "justify-start space-x-3"}">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ${!isCollapsed ? '<span class="font-medium">Logging out...</span>' : ''}
        </div>
      `;
      button.disabled = true;

      setTimeout(() => {
        handleLogout();
      }, 2000);
    }}
    className={`flex items-center w-full p-3 text-brand-ivory/80 hover:bg-red-600/20 hover:text-red-300 rounded-xl transition-all duration-200 group ${
      isCollapsed ? "justify-center" : "justify-start space-x-3"
    }`}
    title={isCollapsed ? "Logout" : ""}
  >
    <LogOut size={20} />
    {!isCollapsed && <span className="font-medium">Logout</span>}
  </button>
</div>
      </aside>
    </>
  );
}
