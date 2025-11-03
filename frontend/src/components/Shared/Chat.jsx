// src/components/Shared/Chat.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { io } from "socket.io-client";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Loader2,
  Trash2,
  Check,
  CheckCheck,
} from "lucide-react";
import api from "../../utils/axios";

const SOCKET_SERVER_URL = "http://localhost:3000";

export default function Chat({
  userId,
  role,
  recipientId,
  recipientRole,
  onMessageSent,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [typing, setTyping] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // -------------------------------
  // Socket.IO setup
  // -------------------------------
  useEffect(() => {
    if (!userId || !role) return;

    const socket = io(SOCKET_SERVER_URL, { autoConnect: false });
    socketRef.current = socket;
    socket.connect();
    socket.emit("join", { userId, role });

    socket.on("receive_message", (data) => {
      // Only add the message if it's part of the current conversation
      if (data.fromUserId === recipientId || data.toUserId === recipientId) {
        setMessages((prev) => [
          ...prev,
          {
            ...data,
            // A received message is one where the sender is not me.
            received: data.sender._id !== userId,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });

    socket.on("user_typing", (data) => {
      if (data.toUserId === userId && data.isTyping) {
        setTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 1000);
      }
    });

    socket.on("user_online", (data) => {
      if (data.userId === recipientId) setIsOnline(true);
    });

    socket.on("user_offline", (data) => {
      if (data.userId === recipientId) setIsOnline(false);
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_typing");
      socket.off("user_online");
      socket.off("user_offline");
      socket.disconnect();
      clearTimeout(typingTimeoutRef.current);
    };
  }, [userId, role, recipientId]);

  // -------------------------------
  // Fetch message history
  // -------------------------------
  useEffect(() => {
    if (!recipientId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/history/${recipientId}`);
        if (res.data.success) {
          const formatted = res.data.data.map((msg) => ({
            ...msg,
            // A received message is one where the sender's ID is not my ID.
            received: msg.sender._id !== userId,
            status: msg.status || "sent",
            timestamp: msg.createdAt || msg.timestamp,
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error("❌ Failed to fetch messages:", err);
      }
    };

    fetchMessages();
  }, [recipientId, userId]); // Dependency array is correct

  // -------------------------------
  // Send message
  // -------------------------------
  const roleToModelMap = {
    client: "ClientProfile",
    vendor: "VendorProfile",
    planner: "PlannerProfile",
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!recipientId) {
      console.error("❌ No recipientId found. Cannot send message.");
      return;
    }
    if (sending) return;

    const tempMessage = input.trim();
    setInput(""); // Optimistic UI
    setSending(true);

    // Stop typing indicator
    socketRef.current?.emit("typing", {
      toUserId: recipientId,
      isTyping: false,
    });

    try {
      const payload = {
        text: tempMessage,
        recipientId,
        recipientModel: roleToModelMap[recipientRole] || "User",
        senderModel: roleToModelMap[role] || "User",
      };

      const res = await api.post("/messages", payload);

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to send message");
      }

      const saved = res.data.message;

      setMessages((prev) => [
        ...prev,
        {
          _id: saved._id,
          text: saved.text,
          sender: { _id: userId }, // Mimic the populated sender structure
          received: false,
          status: "sent",
          timestamp: new Date().toISOString(),
        },
      ]);

      onMessageSent?.();
    } catch (err) {
      console.error("❌ Failed to send message:", err);
      setInput(tempMessage); // Restore input if failed
    } finally {
      setSending(false);
    }
  };

  // -------------------------------
  // Delete message
  // -------------------------------
  const deleteMessage = async (messageId) => {
    setDeletingMessage(messageId);
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (err) {
      console.error("❌ Failed to delete message:", err);
    } finally {
      setDeletingMessage(null);
    }
  };

  // -------------------------------
  // Typing indicator
  // -------------------------------
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socketRef.current || !recipientId) return;
    socketRef.current.emit("typing", { toUserId: recipientId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(
      () =>
        socketRef.current.emit("typing", {
          toUserId: recipientId,
          isTyping: false,
        }),
      1000
    );
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const MessageStatus = ({ status, timestamp }) => (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span>{formatTime(timestamp)}</span>
      {status === "sent" && <Check className="w-3 h-3" />}
      {status === "delivered" && <CheckCheck className="w-3 h-3" />}
      {status === "read" && <CheckCheck className="w-3 h-3 text-blue-500" />}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {recipientRole === "vendor" ? "V" : "C"}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            {recipientRole === "vendor" ? "Vendor" : "Client"}
          </h3>
          <p className="text-sm text-gray-500">
            {typing ? "typing..." : isOnline ? "online" : "offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={`flex ${
                msg.received ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`relative group max-w-[70%] ${
                  msg.received
                    ? "bg-white border border-gray-200"
                    : "bg-blue-500 text-white"
                } rounded-2xl px-4 py-2 shadow-sm`}
              >
                <div className="flex items-end gap-2">
                  <p className="text-sm break-words">{msg.text}</p>
                  <MessageStatus
                    status={msg.status}
                    timestamp={msg.timestamp}
                  />
                </div>
                {!msg.received && (
                  <button
                    onClick={() => deleteMessage(msg._id)}
                    disabled={deletingMessage === msg._id}
                    className="absolute -left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-white border border-gray-200 rounded-full shadow-sm transition-all duration-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  >
                    {deletingMessage === msg._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-2">
        <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
          <Smile className="w-5 h-5" />
        </button>
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Type a message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        {input.trim() ? (
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition duration-200 transform hover:scale-105"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button className="p-3 text-gray-500 hover:text-gray-700 transition-colors">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
