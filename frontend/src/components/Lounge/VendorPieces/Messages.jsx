import React from "react";

export default function Messages() {
  return (
    <div className="p-6 space-y-6 bg-brand-ivory min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-brand-navy mb-2">Messages</h2>
        <p className="text-brand-charcoal/80">
          Communicate with clients and team members
        </p>
      </div>

      <div className="bg-white rounded-xl border border-brand-gold/20 shadow-sm">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-brand-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <h3 className="text-lg font-semibold text-brand-navy mb-2">
            No messages yet
          </h3>
          <p className="text-brand-charcoal/80 max-w-sm mx-auto mb-4">
            When you receive messages from clients or team members, they will
            appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
