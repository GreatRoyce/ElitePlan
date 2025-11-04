import React, { useEffect, useState } from "react";
import { MessageCircle, Search, User, X } from "lucide-react";
import api from "../../../utils/axios";
import Chat from "../../Shared/Chat";

export default function MessagesPanel({ plannerId, onUnreadCountChange }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Use the correct, centralized endpoint for conversations
        const res = await api.get("/messages/conversations");
        if (res.data.success) {
          // Format the conversation data correctly
          const formatted = (res.data.conversations || []).map((convo) => ({
            _id: convo.participant._id,
            participantId: convo.participant._id,
            participantName:
              convo.participant.username ||
              convo.participant.firstName ||
              "Unknown User",
            participantRole: convo.participant.role, // Get the role from the participant data
            lastMessage: convo.lastMessage.text,
            lastMessageTimestamp: convo.lastMessage.createdAt,
            unreadCount: convo.unreadCount || 0,
          }));
          setConversations(formatted);
          // Report the total unread count to the parent
          const totalUnread = formatted.reduce(
            (sum, convo) => sum + convo.unreadCount,
            0
          );
          onUnreadCountChange?.(totalUnread);
        }
      } catch (err) {
        console.error("❌ Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [onUnreadCountChange]);

  // Delete conversation
  const handleDeleteConversation = async (participantId, e) => {
    e.stopPropagation();
    setDeletingConversation(participantId);
    try {
      await api.delete(`/messages/conversations/${participantId}`);
      setConversations((prev) =>
        prev.filter((c) => c.participantId !== participantId)
      );
      if (activeChat === participantId) setActiveChat(null);
    } catch (err) {
      console.error("❌ Error deleting conversation:", err);
    } finally {
      setDeletingConversation(null);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    if (diffHours < 24)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((chat) =>
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-pulse">
          <div className="w-10 h-10 border-4 border-brand-navy border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 h-full p-6 bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy text-lg flex items-center gap-2">
            <MessageCircle size={20} /> Messages
          </h2>
        </div>

        <div className="p-3">
          {/* Search */}
          <div className="flex items-center bg-gray-100 rounded-lg px-2 py-1 mb-4">
            <Search size={16} className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full bg-transparent outline-none text-sm text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {conversations.length === 0 ? (
            <p className="text-gray-400 text-center text-sm mt-8">
              No active conversations.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredConversations.map((chat) => (
                <div
                  key={chat.participantId}
                  onClick={() => setActiveChat(chat)} // Set the entire chat object as active
                  className={`p-3 rounded-xl cursor-pointer transition-all relative group ${
                    activeChat?.participantId === chat.participantId
                      ? "bg-brand-ivory border-l-4 border-brand-gold"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-brand-gold/10 p-2 rounded-full flex-shrink-0">
                        <User size={18} className="text-brand-navy" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-gray-800 truncate">
                          {chat.participantName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {chat.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {chat.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[18px] h-4 flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTime(chat.lastMessageTimestamp)}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={(e) =>
                          handleDeleteConversation(chat.participantId, e)
                        }
                        disabled={deletingConversation === chat.participantId}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200 disabled:opacity-50"
                        title="Delete conversation"
                      >
                        {deletingConversation === chat.participantId ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <X size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-sm flex flex-col h-full">
        {activeChat ? (
          <Chat
            userId={plannerId}
            role="planner"
            recipientId={activeChat.participantId}
            recipientRole={activeChat.participantRole}
            onMessageSent={() => {
              // refresh sidebar to update last message/unread
              const refreshConversations = async () => {
                try {
                  // This part is already changed above
                } catch (err) {
                  console.error("❌ Error refreshing conversations:", err);
                }
              };
              refreshConversations();
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
            <MessageCircle size={50} className="mb-3 opacity-50" />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
