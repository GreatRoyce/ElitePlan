import { io } from "socket.io-client";
import api from "./axios";

const clients = new Map();

const stripApiVersion = (url = "") => url.replace(/\/api\/v\d+\/?$/i, "");

export const getRealtimeBaseUrl = () => {
  const explicitUrl =
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL;
  if (explicitUrl) return stripApiVersion(explicitUrl);

  const apiBase = api.defaults.baseURL || "";
  const inferredBase = stripApiVersion(apiBase);

  return inferredBase || "http://localhost:3000";
};

const getClientKey = ({ userId, role }) => `${String(userId)}::${String(role)}`;

export const getRealtimeClient = ({ userId, role }) => {
  if (!userId || !role) return null;

  const key = getClientKey({ userId, role });
  const existing = clients.get(key);
  if (existing) {
    existing.refs += 1;
    if (!existing.socket.connected) {
      existing.socket.connect();
    }
    return existing.socket;
  }

  const socket = io(getRealtimeBaseUrl(), {
    autoConnect: false,
    withCredentials: true,
    auth: (callback) => callback({ token: localStorage.getItem("token") }),
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.connect();

  clients.set(key, {
    socket,
    refs: 1,
  });

  return socket;
};

export const releaseRealtimeClient = ({ userId, role }) => {
  if (!userId || !role) return;

  const key = getClientKey({ userId, role });
  const existing = clients.get(key);
  if (!existing) return;

  existing.refs -= 1;
  if (existing.refs > 0) return;

  existing.socket.disconnect();
  clients.delete(key);
};

export const getMessageUserId = (message, key = "sender") => {
  const value = message?.[key];
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || null;
  return null;
};

export const normalizeRealtimeMessage = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  const senderId = getMessageUserId(payload, "sender") || payload.fromUserId;
  const recipientId =
    getMessageUserId(payload, "recipient") || payload.toUserId;
  const text = payload.text || payload.message || "";

  if (!senderId || !recipientId || !text) return null;

  return {
    _id:
      payload._id ||
      `${senderId}-${recipientId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    text,
    sender: payload.sender || { _id: senderId },
    recipient: payload.recipient || { _id: recipientId },
    senderId,
    recipientId,
    read: Boolean(payload.read),
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt:
      payload.updatedAt || payload.createdAt || new Date().toISOString(),
  };
};

export const isMessageInConversation = ({
  message,
  currentUserId,
  participantId,
}) => {
  if (!message || !currentUserId || !participantId) return false;

  const senderId =
    getMessageUserId(message, "sender") ||
    message.senderId ||
    message.fromUserId;
  const recipientId =
    getMessageUserId(message, "recipient") ||
    message.recipientId ||
    message.toUserId;

  if (!senderId || !recipientId) return false;

  return (
    (senderId === participantId && recipientId === currentUserId) ||
    (senderId === currentUserId && recipientId === participantId)
  );
};
