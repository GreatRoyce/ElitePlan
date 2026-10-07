import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authStore";
import { hasStaffPermission, isStaff } from "../utils/staffAccess";

export default function StaffRoute({ children, permission }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status" className="p-6 text-center">Checking staff access...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isStaff(user)) return <Navigate to="/lounge" replace />;
  if (!hasStaffPermission(user, permission)) return <div className="min-h-screen bg-brand-ivory p-8 text-brand-navy"><h1 className="text-xl font-semibold">Permission required</h1><p role="alert" className="mt-3 text-sm">Your moderator account does not have access to this page. Contact an admin to review your permissions.</p><Link to="/logout" className="mt-5 inline-block rounded-lg bg-brand-navy px-4 py-2 text-sm text-white">Sign out</Link></div>;
  return children;
}
