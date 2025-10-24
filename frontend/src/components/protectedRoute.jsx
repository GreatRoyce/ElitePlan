import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center p-6">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
