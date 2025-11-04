import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="text-center p-6">Loading...</div>;

  // Redirect guests to login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
