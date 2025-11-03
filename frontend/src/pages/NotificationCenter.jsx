import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Loader2,
  CheckCircle2,
  Trash2,
  MailOpen,
  CheckCircle,
  Filter,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import api from "../utils/axios";

// ==========================
// Notification Item Component
// ==========================
const NotificationItem = ({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const senderName =
    notification.sender?.businessName ||
    notification.sender?.username;

  const profileImage =
    notification.imageCover || notification.sender?.imageCover;

  return (
    <div
      className={`group flex items-start gap-4 p-4 border-b transition-all duration-200 hover:bg-gray-50 ${
        notification.isRead 
          ? "bg-white border-gray-100" 
          : "bg-blue-50 border-blue-100 border-l-4 border-l-blue-500"
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        <img
          src={imageError ? "/default-avatar.png" : profileImage}
          alt={senderName}
          onError={() => setImageError(true)}
          className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
        />
        {!notification.isRead && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-800 leading-relaxed">
              <span className="font-semibold text-gray-900">{senderName}</span>
              <span className="ml-1 text-gray-700">{notification.message}</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {notification.isRead ? (
          <button
            onClick={() => onMarkAsUnread(notification._id)}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors duration-150"
            title="Mark as unread"
          >
            <MailOpen className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onMarkAsRead(notification._id)}
            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors duration-150"
            title="Mark as read"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification._id)}
          className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors duration-150"
          title="Delete notification"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================
// Notification Center Component
// ==========================
export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const res = await api.get("/notifications/mine");
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
      } else {
        throw new Error(res.data.message || "Failed to fetch notifications");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle single notification actions
  const handleAction = async (action, id) => {
    const originalNotifications = [...notifications];

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === id
          ? {
              ...n,
              isRead:
                action === "read"
                  ? true
                  : action === "unread"
                  ? false
                  : n.isRead,
            }
          : n
      ).filter((n) => action !== "delete" || n._id !== id)
    );

    try {
      if (action === "read") await api.patch(`/notifications/${id}/read`);
      if (action === "unread") await api.patch(`/notifications/${id}/unread`);
      if (action === "delete") await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error(`Error performing action: ${action}`, err);
      setNotifications(originalNotifications); // revert on error
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    const originalNotifications = [...notifications];
    try {
      if (action === "markAllRead") {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        await api.patch("/notifications/mark-all-read");
      } else if (action === "deleteAllRead") {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        await api.delete("/notifications/delete-read");
      } else if (action === "clearAll") {
        setNotifications([]);
        await api.delete("/notifications/clear-all");
      }
    } catch (err) {
      console.error(`Error performing bulk action: ${action}`, err);
      setNotifications(originalNotifications);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-xl max-w-4xl mx-auto my-8 border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading notifications...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white shadow-lg rounded-xl max-w-4xl mx-auto my-8 border border-gray-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load notifications</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchNotifications()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl max-w-4xl mx-auto my-8 border border-gray-200">
      {/* Header with bulk actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                  filter === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                  filter === 'unread' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                  filter === 'read' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Read
              </button>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-150"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => handleBulkAction("markAllRead")}
                disabled={unreadCount === 0}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Mark all read
              </button>
              <button
                onClick={() => handleBulkAction("clearAll")}
                disabled={notifications.length === 0}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onMarkAsRead={(id) => handleAction("read", id)}
              onMarkAsUnread={(id) => handleAction("unread", id)}
              onDelete={(id) => handleAction("delete", id)}
            />
          ))
        ) : (
          <div className="text-center p-12 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-semibold text-lg text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 
               filter === 'read' ? 'No read notifications' : 'You\'re all caught up!'}
            </p>
            <p className="text-sm text-gray-600">
              {filter === 'all' ? 'You have no new notifications.' : 
               `No ${filter} notifications found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}