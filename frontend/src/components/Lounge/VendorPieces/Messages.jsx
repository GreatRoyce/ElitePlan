// src/components/Lounge/VendorPieces/Messages.jsx
import React, { useState, useEffect } from "react";
import Chat from "../../Shared/Chat";
import api from "../../../utils/axios";

export default function Messages({ vendorId, onUnreadCountChange }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingConversation, setDeletingConversation] = useState(null);

  // Fetch all conversations for this vendor
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get("/messages/conversations");
        console.log("What message is fetched :", res.data);
        if (res.data.success) {
          const formattedConversations = (res.data.conversations || []).map(
            (convo) => ({
              _id: convo.participant._id,
              participantId: convo.participant._id,
              participantName:
                convo.participant.username ||
                convo.participant.firstName ||
                "Unknown User",
              participantRole: convo.participant.role,
              lastMessage: convo.lastMessage.text,
              lastMessageTimestamp: convo.lastMessage.createdAt,
              unreadCount: convo.unreadCount || 0,
            })
          );
          setConversations(formattedConversations);
          const totalUnread = formattedConversations.reduce(
            (sum, convo) => sum + convo.unreadCount, 0
          );
          onUnreadCountChange?.(totalUnread);
        }
      } catch (error) {
        console.error("❌ Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [onUnreadCountChange]);

  // Delete conversation
  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    setDeletingConversation(conversationId);
    
    try {
      await api.delete(`/messages/conversations/${conversationId}`);
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.participantId !== conversationId));
      
      // If the deleted conversation was active, clear active chat
      if (activeChat === conversationId) {
        setActiveChat(null);
      }
    } catch (error) {
      console.error("❌ Error deleting conversation:", error);
    } finally {
      setDeletingConversation(null);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brand-navy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
        <p className="text-gray-600">
          Communicate with clients and team members
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar - Conversations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-lg">
              Conversations
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No conversations yet</p>
                <p className="text-gray-400 text-xs mt-1">Start a conversation from a booking</p>
              </div>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => setActiveChat(chat.participantId)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all relative group hover:bg-gray-50 ${
                    activeChat === chat.participantId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {chat.participantName}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-5 h-5 flex items-center justify-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTime(chat.lastMessageTimestamp)}
                      </span>
                      
                      {/* Delete Button - WhatsApp Style */}
                      <button
                        onClick={(e) => handleDeleteConversation(chat.participantId, e)}
                        disabled={deletingConversation === chat.participantId}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200 disabled:opacity-50"
                        title="Delete conversation"
                      >
                        {deletingConversation === chat.participantId ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          {activeChat ? (
            <Chat
              userId={vendorId}
              role="vendor"
              recipientId={activeChat.participantId}
              recipientRole="client"
              onMessageSent={() => {
                // Refresh conversations to update last message
                // This could be optimized with a more granular update
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-500 mb-2">No conversation selected</p>
              <p className="text-sm text-gray-400">Choose a conversation from the list to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}