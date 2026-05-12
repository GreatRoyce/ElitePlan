import React from "react";
import { useAuth } from "../../../context/authStore";
import MessagePanel from "../PlannerPieces/MessagePanel";

export default function MessagesSection({ onUnreadCountChange }) {
  const { user } = useAuth();

  return (
    <MessagePanel
      currentUserId={user?._id}
      currentRole="client"
      onUnreadCountChange={onUnreadCountChange}
    />
  );
}
