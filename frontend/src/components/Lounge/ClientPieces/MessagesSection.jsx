// components/Lounge/VendorPieces/MessagesSection.jsx
import React, { useState, useEffect } from "react";
import Chat from "../../Shared/Chat";
import api from "../../../utils/axios"; // Corrected import path
import { useAuth } from "../../../context/authContext";

export default function MessagesSection({ vendorId }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch all conversations for this vendor
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get("/messages/conversations");
        if (res.data.success) {
          const formattedConversations = (res.data.conversations || []).map(
            (convo) => ({
              _id: convo.participant._id,
              participantId: convo.participant._id,
              participantName:
                convo.participant.username ||
                convo.participant.firstName ||
                "Unknown User",
              participantRole: convo.participant.role, // client or planner
              lastMessage: convo.lastMessage.text,
              lastMessageTimestamp: convo.lastMessage.createdAt,
            })
          );
          setConversations(formattedConversations);
        }
      } catch (error) {
        console.error("❌ Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) {
    return (
      <div className="text-gray-500 text-center mt-10 animate-pulse">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-brand-ivory min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-brand-navy mb-2">Messages</h2>
        <p className="text-brand-charcoal/80">
          Communicate with clients and planners
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-full">
        {/* Sidebar */}
        <div className="border-r border-gray-200 bg-white rounded-2xl shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-brand-navy text-lg">
              Conversations
            </h2>
          </div>

          <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-center text-sm mt-8">
                No active conversations.
              </p>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => setActiveChat(chat)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    activeChat?.participantId === chat.participantId
                      ? "bg-brand-ivory border-l-4 border-brand-gold"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium text-gray-800">
                    {chat.participantName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm flex flex-col h-full">
          {activeChat ? (
            <Chat
              userId={vendorId || user?._id}
              role="vendor"
              recipientId={activeChat.participantId}
              recipientRole={activeChat.participantRole}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
              <div className="w-16 h-16 bg-brand-navy/10 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-brand-navy"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
