// src/components/Lounge/VendorPieces/PendingRequests.jsx
import React, { useEffect, useState, useRef } from "react";
import { Check, X, User, Calendar, Loader2, MapPin, Users } from "lucide-react";
import api from "../../../utils/axios";
import squeeze from "../../../../src/assets/edge.png";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:3000"; // Update if needed

export default function PendingRequests({ vendorId }) {
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // "approve" or "decline"

  const socketRef = useRef(null);

  // ===============================
  // 1️⃣ Connect Socket.IO for real-time messages
  // ===============================
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, { autoConnect: false });
    const socket = socketRef.current;
    socket.connect();

    // Join vendor room
    socket.emit("join", { userId: vendorId, role: "vendor" });

    return () => {
      socket.disconnect();
    };
  }, [vendorId]);

  // ===============================
  // 2️⃣ Fetch pending requests
  // ===============================
  useEffect(() => {
    const fetchPending = async () => {
      setLoadingRequests(true);
      try {
        const res = await api.get("/consultation/mine");
        console.log("✅ Vendor fetched pending requests:", res.data);
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
      console.log(`🚀 Updating request ${id} -> ${status}`);
      const res = await api.patch(`/consultation/${id}/status`, { status });

      // Remove request from UI
      setRequests((prev) => prev.filter((req) => req._id !== id));
      setSelectedRequest(null);
      setActionType(null);
      console.log(`✅ Request ${id} updated.`);

      if (status === "approved") {
        const request = res.data.consultation;

        // Determine client ID
        const clientId =
          request.client?._id ||
          request.user?._id ||
          (request.targetType === "ClientProfile"
            ? request.targetUser?._id
            : undefined);

        // Determine vendor ID
        const vendorId =
          request.vendor?._id ||
          request.user?._id ||
          (request.targetType === "VendorProfile"
            ? request.targetUser?._id
            : undefined);

        // Determine sender/recipient models
        const senderModel =
          request.targetType === "VendorProfile"
            ? "VendorProfile"
            : "PlannerProfile";
        const recipientModel = "ClientProfile";

        if (clientId && vendorId) {
          const messageText = `Hi ${
            request.client?.name || request.user?.username || "there"
          }, your request has been approved!`;

          // Save message in backend
          const messageRes = await api.post("/messages", {
            sender: vendorId,
            senderModel,
            recipientId: clientId,
            recipientModel,
            text: messageText,
          });

          console.log(`📩 Auto-message saved for client ${clientId}`);

          // Emit real-time message via socket
          socketRef.current.emit("send_message", {
            fromUserId: vendorId,
            toUserId: clientId,
            message: messageText,
          });

          console.log(`⚡ Auto-message emitted via Socket.IO`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to ${status} request:`, error);
    }
  };

  return (
    <div className="p-6 bg-brand-ivory min-h-screen">
      <h2 className="text-2xl font-bold text-brand-navy mb-2">
        Pending Requests
      </h2>
      <p className="text-brand-charcoal/80 mb-6">
        Manage your incoming event requests and bookings
      </p>

      {loadingRequests ? (
        <div className="text-gray-500 text-center animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-navy" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-gold/20 shadow-sm">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-brand-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-brand-navy mb-2">
              No pending requests
            </h3>
            <p className="text-brand-charcoal/80 max-w-sm mx-auto">
              You're all caught up! New event requests will appear here for your
              review.
            </p>
          </div>
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
                {selectedRequest.client?.name ||
                  selectedRequest.user?.username ||
                  "Unknown"}
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
                {actionType === "approve" ? <Check size={16} /> : <X size={16} />}
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
// RequestCard Component
// =========================
function RequestCard({ request, onSelect }) {
  const {
    client,
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

  const formatLocation = (location) =>
    location
      ? [location.city, location.state, location.country].filter(Boolean).join(", ")
      : null;

  const formatGuests = (guests) =>
    guests ? `${guests.min || 0}-${guests.max || 0} guests` : null;

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
          <span className="capitalize">
            From: {client?.name || user?.username || "Unknown"}
          </span>
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
        {guests && (guests.min || guests.max) && (
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
          style={{ backgroundImage: `url(${sqz})` }}
          onClick={() => onSelect("approve")}
          className="flex items-center gap-2 bg-contain border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium text-sm px-2 py-2 rounded-lg flex-1 justify-center transition-all duration-200"
        >
          <Check size={16} /> Approve
        </button>
        <div className="w-2"></div>
        <button
          style={{ backgroundImage: `url(${sqz})` }}
          onClick={() => onSelect("decline")}
          className="flex items-center gap-1 bg-contain border-2 border-red-500 text-red-600 hover:bg-red-50 font-medium text-sm px-2 py-2 rounded-lg flex-1 justify-center transition-all duration-200"
        >
          <X size={16} /> Decline
        </button>
      </div>
    </div>
  );
}
