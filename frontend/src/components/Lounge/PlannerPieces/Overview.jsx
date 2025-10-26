import React from "react";

export default function Overview({ events }) {
  if (!events?.length)
    return (
      <p className="text-gray-500">No events or requests at the moment.</p>
    );

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <ul className="divide-y divide-gray-200">
        {events.map((e) => (
          <li
            key={e._id}
            className="py-3 flex justify-between items-center hover:bg-brand-ivory/60 px-2 rounded-lg"
          >
            <div>
              <p className="font-medium text-brand-navy">
                {e.title || "Untitled Event"}
              </p>
              <p className="text-sm text-gray-500 capitalize">
                Status: {e.status || "Pending"}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              {e.date ? new Date(e.date).toLocaleDateString() : "No Date"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
