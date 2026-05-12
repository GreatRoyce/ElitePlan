import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import api from "../../utils/axios";
import {
  getRealtimeClient,
  releaseRealtimeClient,
  normalizeRealtimeMessage,
  isMessageInConversation,
  getMessageUserId,
} from "../../utils/realtime";

const ROLE_TO_MODEL_MAP = {
  client: "User",
  vendor: "User",
  planner: "User",
};

const appendUniqueMessage = (messages, nextMessage) => {
  if (!nextMessage) return messages;
  const nextId = nextMessage._id;
  if (nextId && messages.some((msg) => msg._id === nextId)) {
    return messages;
  }
  return [...messages, nextMessage];
};

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

  useEffect(() => {
    if (!userId || !role) return () => {};

    const socket = getRealtimeClient({ userId, role });
    socketRef.current = socket;

    const handleReceiveMessage = (payload) => {
      const normalized = normalizeRealtimeMessage(payload);
      if (!normalized) return;

      if (
        !isMessageInConversation({
          message: normalized,
          currentUserId: userId,
          participantId: recipientId,
        })
      ) {
        return;
      }

      setMessages((prev) =>
        appendUniqueMessage(prev, {
          ...normalized,
          received: normalized.senderId !== userId,
          status: normalized.read ? "read" : "delivered",
          timestamp: normalized.createdAt,
        })
      );
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      releaseRealtimeClient({ userId, role });
      socketRef.current = null;
      clearTimeout(typingTimeoutRef.current);
    };
  }, [userId, role, recipientId]);

  useEffect(() => {
    if (!recipientId || !userId) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/history/${recipientId}`);
        if (res.data.success) {
          const formatted = (res.data.data || []).map((msg) => {
            const senderId = getMessageUserId(msg, "sender");
            return {
              ...msg,
              senderId,
              recipientId: getMessageUserId(msg, "recipient"),
              received: senderId !== userId,
              status: msg.read ? "read" : "delivered",
              timestamp: msg.createdAt || msg.timestamp,
            };
          });
          setMessages(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();
  }, [recipientId, userId]);

  const sendMessage = async () => {
    if (!input.trim() || !recipientId || sending || !userId) return;

    const tempMessageText = input.trim();
    setInput("");
    setSending(true);
    setTyping(false);

    try {
      const payload = {
        text: tempMessageText,
        recipientId,
        recipientModel: ROLE_TO_MODEL_MAP[recipientRole] || "User",
        senderModel: ROLE_TO_MODEL_MAP[role] || "User",
      };

      const res = await api.post("/messages", payload);
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to send message");
      }

      const saved = normalizeRealtimeMessage(res.data.message);
      if (!saved) {
        throw new Error("Message response format not supported");
      }

      const outbound = {
        ...saved,
        received: false,
        status: "sent",
        timestamp: saved.createdAt || new Date().toISOString(),
      };

      setMessages((prev) => appendUniqueMessage(prev, outbound));

      socketRef.current?.emit("send_message", {
        fromUserId: userId,
        toUserId: recipientId,
        message: saved.text,
      });

      onMessageSent?.(outbound);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(tempMessageText);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setTyping(Boolean(e.target.value.trim()));
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1000);
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

  const roleLabelMap = {
    vendor: "Vendor",
    planner: "Planner",
    client: "Client",
  };
  const roleInitialMap = {
    vendor: "V",
    planner: "P",
    client: "C",
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {roleInitialMap[recipientRole] || "U"}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            {roleLabelMap[recipientRole] || "User"}
          </h3>
          <p className="text-sm text-gray-500">{typing ? "typing..." : "online"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={`flex ${msg.received ? "justify-start" : "justify-end"}`}
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
                  <MessageStatus status={msg.status} timestamp={msg.timestamp} />
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

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
