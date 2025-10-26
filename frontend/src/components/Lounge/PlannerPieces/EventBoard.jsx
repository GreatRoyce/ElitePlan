import React, { useState, useEffect } from "react";
import { CalendarDays, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "../../utils/axios"; // ✅ connect to your backend API

function EventBoard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get("/planner-dashboard");
        if (res.data.success) {
          // Flatten all events from dashboard
          setEvents(res.data.data.events || []);
        }
      } catch (err) {
        console.error("❌ Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const groupedEvents = {
    upcoming: events.filter((e) => e.status === "upcoming"),
    ongoing: events.filter((e) => e.status === "ongoing"),
    completed: events.filter((e) => e.status === "completed"),
    cancelled: events.filter((e) => e.status === "cancelled"),
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 mt-20 animate-pulse">
        Loading your event board...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {Object.entries(groupedEvents).map(([status, list]) => (
        <div key={status}>
          <h2
            className={`text-xl font-semibold mb-4 capitalize ${
              status === "upcoming"
                ? "text-emerald-600"
                : status === "ongoing"
                ? "text-blue-600"
                : status === "completed"
                ? "text-brand-gold"
                : "text-red-500"
            }`}
          >
            {status} Events
          </h2>

          {list.length === 0 ? (
            <p className="text-gray-400 text-sm italic">
              No {status} events available.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {list.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case "upcoming":
        return "bg-emerald-50 border-emerald-400 text-emerald-700";
      case "ongoing":
        return "bg-blue-50 border-blue-400 text-blue-700";
      case "completed":
        return "bg-yellow-50 border-yellow-400 text-yellow-700";
      case "cancelled":
        return "bg-red-50 border-red-400 text-red-700";
      default:
        return "bg-gray-50 border-gray-300 text-gray-700";
    }
  };

  return (
    <div
      className={`border rounded-2xl shadow-sm p-5 hover:shadow-md transition-all duration-300 ${getStatusStyle(
        event.status
      )}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">{event.name}</h3>
        <span className="text-sm capitalize px-3 py-1 rounded-full border">
          {event.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <p className="flex items-center space-x-2">
          <CalendarDays size={16} />
          <span>{new Date(event.date).toLocaleDateString()}</span>
        </p>

        <p className="flex items-center space-x-2">
          <Users size={16} />
          <span>Client: {event.client?.name || "N/A"}</span>
        </p>

        {event.vendors && event.vendors.length > 0 && (
          <div>
            <p className="font-medium mt-2">Vendors:</p>
            <ul className="list-disc ml-5 text-xs">
              {event.vendors.map((v, idx) => (
                <li key={idx}>
                  {v.vendor?.name || "Unnamed Vendor"}{" "}
                  <span className="italic text-gray-600">({v.role})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <p className="flex items-center space-x-1">
          <Clock size={14} />
          <span>
            Created {new Date(event.createdAt).toLocaleDateString()}
          </span>
        </p>
        <StatusIcon status={event.status} />
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  switch (status) {
    case "upcoming":
      return <Clock size={18} className="text-emerald-500" />;
    case "ongoing":
      return <CalendarDays size={18} className="text-blue-500" />;
    case "completed":
      return <CheckCircle size={18} className="text-yellow-500" />;
    case "cancelled":
      return <XCircle size={18} className="text-red-500" />;
    default:
      return null;
  }
}

export default EventBoard;
