import React, { useEffect, useState } from "react";
import { Check, X, User, Calendar, Briefcase } from "lucide-react";
import api from "../../../utils/axios";

function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch pending requests (for planner)
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get("/planner-dashboard/requests");
        if (res.data.success) {
          setRequests(res.data.data || []);
        }
      } catch (error) {
        console.error("❌ Error fetching pending requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleDecision = async (id, decision) => {
    try {
      const res = await api.post(`/planner-dashboard/requests/${id}/${decision}`);
      if (res.data.success) {
        setRequests((prev) => prev.filter((req) => req._id !== id));
      }
    } catch (error) {
      console.error(`❌ Failed to ${decision} request:`, error);
    }
  };

  if (loading) {
    return (
      <div className="text-gray-500 text-center mt-10 animate-pulse">
        Loading pending requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-gray-400 text-center mt-10 italic">
        No pending requests right now 🎉
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-brand-navy mb-2">
        Pending Requests
      </h2>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {requests.map((req) => (
          <RequestCard
            key={req._id}
            request={req}
            onDecision={handleDecision}
          />
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request, onDecision }) {
  const { _id, sender, type, event, message } = request;

  return (
    <div className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">
          {type === "vendor"
            ? "Vendor Collaboration Request"
            : "Client Booking Request"}
        </h3>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <p className="flex items-center gap-2">
          <User size={16} />
          <span>{sender?.name || "Unknown Sender"}</span>
        </p>

        {event && (
          <p className="flex items-center gap-2">
            <Calendar size={16} />
            <span>Event: {event?.name || "N/A"}</span>
          </p>
        )}

        {type === "vendor" && (
          <p className="flex items-center gap-2">
            <Briefcase size={16} />
            <span>Category: {sender?.category || "General Service"}</span>
          </p>
        )}

        {message && (
          <p className="mt-2 text-gray-700 text-sm italic border-t pt-2">
            “{message}”
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button
          onClick={() => onDecision(_id, "accept")}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-lg"
        >
          <Check size={16} /> Accept
        </button>
        <button
          onClick={() => onDecision(_id, "reject")}
          className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1.5 rounded-lg"
        >
          <X size={16} /> Reject
        </button>
      </div>
    </div>
  );
}

export default PendingRequests;
