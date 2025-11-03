// src/components/Lounge/Shared/Notifications.jsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import api from "../../utils/axios";
import { Link } from "react-router-dom";

export default function Notifications({
  initialNotifications = [],
  pendingRequestsCount = 0,
  onRefreshData,
  setActiveSection,
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [loading, setLoading] = useState(!initialNotifications.length);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [markingRead, setMarkingRead] = useState(new Set());
  const [hasBeenViewed, setHasBeenViewed] = useState(false); // Tracks if user opened dropdown
  const wrapperRef = useRef(null);

  // ========= UNREAD COUNT =========
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length + pendingRequestsCount,
    [notifications, pendingRequestsCount]
  );

  // ========= FETCH NOTIFICATIONS =========
  const fetchNotifications = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const res = await api.get("/notifications/mine"); // ✅ Correct endpoint
        console.log("What is it fetching:", res.data);

        if (res.data.success) {
          const newNotifications = res.data.notifications || [];
          if (newNotifications.length > notifications.length) {
            setHasBeenViewed(false);
          }
          setNotifications(newNotifications);
        } else {
          throw new Error(res.data.message || "Failed to fetch notifications");
        }
      } catch (err) {
        console.error("❌ Error fetching notifications:", err);
        setError(err.response?.data?.message || "Failed to load notifications");
        if (showLoading) setNotifications([]);
      } finally {
        setLoading(false);
      }
    },
    [notifications.length]
  );

  // ========= MARK SINGLE AS READ =========
  const markAsRead = useCallback(
    async (notificationId) => {
      if (markingRead.has(notificationId)) return;

      setMarkingRead((prev) => new Set(prev).add(notificationId));

      try {
        await api.patch(`/notifications/${notificationId}/read`);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
      } catch (err) {
        console.error("❌ Error marking notification as read:", err);
        fetchNotifications();
      } finally {
        setMarkingRead((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [markingRead, fetchNotifications]
  );

  // ========= MARK ALL AS READ =========
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n._id);
    if (!unreadIds.length) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n._id) ? { ...n, isRead: true } : n))
    );

    try {
      await api.patch("/notifications/mark-all-read"); // ✅ Correct endpoint
    } catch (err) {
      console.error("❌ Error marking all as read:", err);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  // ========= HANDLE NOTIFICATION CLICK =========
  const handleNotificationClick = useCallback(
    async (notification, targetSection) => {
      if (!notification.isRead) await markAsRead(notification._id);

      if (onRefreshData && targetSection === "requests") await onRefreshData();

      setOpen(false);

      if (targetSection && setActiveSection) {
        setActiveSection(targetSection);
      }
    },
    [markAsRead, onRefreshData, setActiveSection]
  );

  // ========= EFFECTS =========
  // Initial fetch
  useEffect(() => {
    if (!initialNotifications.length) fetchNotifications(true);
  }, [fetchNotifications, initialNotifications.length]);

  // Periodic refresh when dropdown is open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [open, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setOpen((prev) => !prev);
    if (!open) setHasBeenViewed(true);
  };

  // ========= RENDER NOTIFICATION ITEM =========
  const renderNotificationItem = useCallback(
    (notification) => {
      const senderName =
        notification.sender?.businessName || notification.sender?.fullName;
      const profileImage =
        notification.sender?.imageCover || "/default-avatar.png";

      return (
        <div
          key={notification._id}
          onClick={() => {
            const sectionMap = {
              consultation: "requests",
              message: "messages",
              booking: "events",
            };
            handleNotificationClick(
              notification,
              sectionMap[notification.type]
            );
          }}
          className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-all duration-200 ${
            notification.isRead
              ? "bg-white hover:bg-gray-50 text-gray-700"
              : "bg-blue-50 hover:bg-blue-100 text-brand-navy font-semibold border-l-2 border-l-blue-500"
          }`}
        >
          <img
            src={profileImage}
            alt={senderName}
            onError={(e) => (e.target.src = "/default-avatar.png")}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm leading-relaxed">
              <span className="font-semibold truncate">{senderName}</span>
              <span className="ml-1">{notification.message}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {markingRead.has(notification._id) ? (
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
            ) : !notification.isRead ? (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
          </div>
        </div>
      );
    },
    [handleNotificationClick, markingRead]
  );

  // ========= RENDER =========
  return (
    <div className="relative" ref={wrapperRef}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className={`relative p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
          open ? "bg-gray-100" : ""
        }`}
        aria-label={`Notifications ${
          unreadCount ? `(${unreadCount} unread)` : ""
        }`}
      >
        <Bell className="text-brand-navy w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
              !hasBeenViewed ? "animate-pulse" : ""
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-brand-navy text-lg">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {unreadCount} unread
                </span>
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Mark all read
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <p className="text-gray-500 text-sm">
                  Loading notifications...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="text-red-500 text-sm text-center mb-3">
                  {error}
                </div>
                <button
                  onClick={() => fetchNotifications(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length ? (
              notifications.map(renderNotificationItem)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Bell className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm text-center">
                  No notifications yet.
                  <br />
                  We'll notify you when something arrives.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && !loading && !error && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block w-full text-center text-sm text-blue-600 hover:underline font-medium py-1"
              >
                View All Notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
