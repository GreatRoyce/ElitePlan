import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear user state immediately
    logout();

    // Redirect to landing page after brief delay
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Logging out</h1>
        <p className="text-gray-600">Redirecting to home page...</p>
      </div>
    </div>
  );
}

export default Logout;