import React from "react";

export default function PendingRequests() {
  return (
    <div className="p-6 space-y-6 bg-brand-ivory min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-brand-navy mb-2">
          Pending Requests
        </h2>
        <p className="text-brand-charcoal/80">
          Manage your incoming event requests and bookings
        </p>
      </div>

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
    </div>
  );
}
