import React from "react";
import { useLocation, Navigate } from "react-router-dom";
import Consultform from "./consultform";

export default function ConsultformWrapper() {
  const location = useLocation();
  const { targetUserId, targetType } = location.state || {};

  if (!targetUserId) {
    return <Navigate to="/" replace />;
  }

  return <Consultform targetUserId={targetUserId} targetType={targetType} />;
}
