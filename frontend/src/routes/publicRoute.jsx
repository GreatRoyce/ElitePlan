import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="text-center p-6">Loading...</div>;

  // If user is logged in, redirect them away from public pages,
  // UNLESS they are on the logout page itself.
  if (user && location.pathname !== "/logout") {
    return <Navigate to="/lounge" replace />; // redirect logged-in users
  }

  return children;
};

export default PublicRoute;
