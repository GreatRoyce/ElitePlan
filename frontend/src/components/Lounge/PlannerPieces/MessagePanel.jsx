import React, { useEffect, useState } from "react";
import { MessageCircle, Search, Send, User } from "lucide-react";
import api from "../../../utils/axios"

function MessagesPanel() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Fetch all conversations for this planner
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get("/planner-dashboard/messages");
        if (res.data.success) {
          setConversations(res.data.data || []);
        }
      } catch (error) {
        console.error("❌ Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // ✅ When chat is opened, fetch its messages
  const openConversation = async (chatId) => {
    setActiveChat(chatId);
    try {
      const res = await api.get(`/planner-dashboard/messages/${chatId}`);
      if (res.data.success) {
        setMessages(res.data.data || []);
      }
    } catch (error) {
      console.error("❌ Error loading chat:", error);
    }
  };

  // ✅ Send new message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await api.post(`/planner-dashboard/messages/${activeChat}`, {
        text: newMessage,
      });
      if (res.data.success) {
        setMessages((prev) => [...prev, res.data.message]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("❌ Failed to send message:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-gray-500 text-center mt-10 animate-pulse">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* 📨 Sidebar: List of Conversations */}
      <div className="border-r border-gray-200 bg-white rounded-2xl shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy text-lg flex items-center gap-2">
            <MessageCircle size={20} />
            Messages
          </h2>
        </div>

        <div className="p-3">
          <div className="flex items-center bg-gray-100 rounded-lg px-2 py-1 mb-4">
            <Search size={16} className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          {conversations.length === 0 ? (
            <p className="text-gray-400 text-center text-sm mt-8">
              No active conversations.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {conversations.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => openConversation(chat._id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    activeChat === chat._id
                      ? "bg-brand-ivory border-l-4 border-brand-gold"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-gold/10 p-2 rounded-full">
                      <User size={18} className="text-brand-navy" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {chat.participantName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 💬 Chat Window */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-sm flex flex-col">
        {activeChat ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <div className="bg-brand-gold/10 p-2 rounded-full">
                <User size={18} className="text-brand-navy" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {
                    conversations.find((c) => c._id === activeChat)
                      ?.participantName
                  }
                </p>
                <p className="text-xs text-gray-500">Active conversation</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl text-sm max-w-xs ${
                      msg.isSender
                        ? "bg-brand-gold text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSend}
              className="border-t p-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button
                type="submit"
                className="bg-brand-gold hover:bg-brand-gold/80 text-white p-2 rounded-xl"
              >
                <Send size={18} />
              </button>
            </form>
          </>
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

export default MessagesPanel;
