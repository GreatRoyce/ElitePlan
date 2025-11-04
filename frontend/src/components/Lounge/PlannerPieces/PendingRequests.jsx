import React, { useEffect, useState, useRef } from "react";
import { Check, X, User, Calendar, Loader2, MapPin, Users } from "lucide-react";
import api from "../../../utils/axios";
import squeeze from "../../../../src/assets/edge.png";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:3000"; // Update if needed

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const socketRef = useRef(null);

  // ===============================
  // 1️⃣ Socket.IO connection
  // ===============================
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, { autoConnect: false });
    const socket = socketRef.current;
    socket.connect();

    // Join planner room
    socket.emit("join", { userId: "planner", role: "planner" });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ===============================
  // 2️⃣ Fetch pending requests
  // ===============================
  useEffect(() => {
    const fetchPending = async () => {
      setLoadingRequests(true);
      try {
        const res = await api.get("/consultation/mine");
        setRequests(res.data || []);
      } catch (err) {
        console.error("❌ Error fetching pending requests:", err);
        setRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchPending();
  }, []);

  // ===============================
  // 3️⃣ Handle approve/decline
  // ===============================
  const handleDecision = async (id, status) => {
    try {
      const res = await api.patch(`/consultation/${id}/status`, { status });
      setRequests((prev) => prev.filter((r) => r._id !== id));
      setSelectedRequest(null);
      setActionType(null);

      if (status === "approved") {
        const request = res.data;
        const clientId = request.user?._id;
        const plannerId = request.planner || request.vendor;
        const messageText = `Hi ${
          request.user?.username || "there"
        }, your request has been approved!`;

        // Save message in backend
        await api.post("/messages", {
          senderId: plannerId,
          recipientId: clientId,
          text: messageText,
        });

        // Emit real-time message
        socketRef.current.emit("send_message", {
          fromUserId: plannerId,
          toUserId: clientId,
          message: messageText,
        });
      }
    } catch (err) {
      console.error(`❌ Failed to ${status} request:`, err);
    }
  };

  return (
    <div className="p-6 bg-brand-ivory min-h-screen">
      <h2 className="text-2xl font-bold text-brand-navy mb-4">
        Pending Requests
      </h2>

      {loadingRequests ? (
        <div className="text-gray-500 text-center animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-navy" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-gray-400 text-center italic">
          No pending requests right now 🎉
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((req) => (
            <RequestCard
              key={req._id}
              request={req}
              onSelect={(action) => {
                setSelectedRequest(req);
                setActionType(action);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal for approve/decline */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg mb-5 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {actionType === "approve" ? "Approve Request" : "Decline Request"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to{" "}
              <span
                className={
                  actionType === "approve"
                    ? "text-brand-navy"
                    : "text-brand-royal"
                }
              >
                {actionType}
              </span>{" "}
              this request from{" "}
              <strong className="capitalize">
                {selectedRequest.user?.username || "Unknown"}
              </strong>
              ?
            </p>
            <div className="flex justify-between mt-4">
              <button
                onClick={() =>
                  handleDecision(
                    selectedRequest._id,
                    actionType === "approve" ? "approved" : "declined"
                  )
                }
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-white ${
                  actionType === "approve"
                    ? "bg-brand-navy hover:bg-brand-navy/70"
                    : "bg-brand-royal hover:bg-brand-royal/70"
                }`}
              >
                {actionType === "approve" ? (
                  <Check size={16} />
                ) : (
                  <X size={16} />
                )}
                {actionType === "approve" ? "Approve" : "Decline"}
              </button>

              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Single Request Card
// =========================
function RequestCard({ request, onSelect }) {
  const {
    user,
    targetType,
    eventType,
    eventDate,
    eventTime,
    eventLocation,
    guests,
    services,
    vendorType,
    notes,
  } = request;

  const formatLocation = (loc) =>
    loc ? [loc.city, loc.state, loc.country].filter(Boolean).join(", ") : null;

  const formatGuests = (g) => (g ? `${g.min || 0}-${g.max || 0} guests` : null);

  return (
    <div
      className="border border-gray-200 rounded-2xl p-5 bg-cover bg-no-repeat bg-center shadow-sm bg-white hover:shadow-md transition-all duration-300 flex flex-col h-full min-h-[400px]"
      style={{ backgroundImage: `url(${squeeze})` }}
    >
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="font-semibold text-brand-navy text-lg leading-tight">
          {targetType === "VendorProfile"
            ? "Vendor Collaboration Request"
            : "Client Booking Request"}
        </h3>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <p className="flex items-center gap-2">
          <User size={16} />
          <span className="capitalize">From: {user?.username}</span>
        </p>
      </div>

      <div className="space-y-2 text-sm text-gray-600 flex-1 min-h-0 overflow-hidden">
        {eventType && (
          <p className="flex items-center gap-2">
            <Calendar size={16} />
            <span className="truncate">
              {eventType} on{" "}
              {eventDate ? new Date(eventDate).toLocaleDateString() : "N/A"}
              {eventTime ? ` at ${eventTime}` : ""}
            </span>
          </p>
        )}

        {eventLocation && formatLocation(eventLocation) && (
          <p className="flex items-center gap-2">
            <MapPin size={16} />
            <span className="truncate">{formatLocation(eventLocation)}</span>
          </p>
        )}

        {guests && (
          <p className="flex items-center gap-2">
            <Users size={16} />
            <span>{formatGuests(guests)}</span>
          </p>
        )}

        {services?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Services:</p>
            <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
              {services.map((service, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-brand-royal/20 text-brand-royal text-xs rounded-full flex-shrink-0"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {vendorType?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Vendor Types:</p>
            <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
              {vendorType.map((type, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-brand-emerald/10 text-green-700 text-xs rounded-full flex-shrink-0"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {notes && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-gray-700 text-sm italic line-clamp-2">
              "{notes}"
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 gap-2 pt-3 border-t border-gray-200 flex-shrink-0">
        <button
          style={{ backgroundImage: `url(${squeeze})` }}
          onClick={() => onSelect("approve")}
          className="flex items-center gap-2 bg-contain border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium text-sm px-2 py-2 rounded-lg flex-1 justify-center transition-all duration-200"
        >
          <Check size={16} /> Approve
        </button>
        <div className="w-2"></div>
        <button
          style={{ backgroundImage: `url(${squeeze})` }}
          onClick={() => onSelect("decline")}
          className="flex items-center gap-1 bg-contain bg-white/80 border-2 border-red-500 text-red-600 hover:bg-red-50 font-medium text-sm px-2 py-2 rounded-lg flex-1 justify-center transition-all duration-200"
        >
          <X size={16} /> Decline
        </button>
      </div>
    </div>
  );
}
