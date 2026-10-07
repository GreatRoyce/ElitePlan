import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authStore";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p role="status" className="p-6 text-center">Checking admin access...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin") return <Navigate to={user.role === "moderator" ? "/moderator" : "/lounge"} replace />;
  return children;
}
