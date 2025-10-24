import React from "react";
import { MessageCircle as MessageIcon } from "lucide-react";

export default function MessagesSection() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <MessageIcon size={48} className="mx-auto text-gray-400 mb-4" />
      <h3 className="text-xl font-semibold text-gray-700 mb-2">Messages</h3>
      <p className="text-gray-500">Your messages will appear here</p>
    </div>
  );
}
