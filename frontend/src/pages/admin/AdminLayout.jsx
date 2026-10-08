import { NavLink, Link, useLocation } from "react-router-dom";
import { Archive, BarChart3, Flag, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../../context/authStore";
import { hasStaffPermission } from "../../utils/staffAccess";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/analytics", label: "Site analytics", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/archive", label: "Removed users", icon: Archive },
  { to: "/admin/moderators", label: "Moderators", icon: ShieldCheck },
  { to: "/admin/reports", label: "Reports & complaints", icon: Flag },
  { to: "/admin/verification", label: "Profile verification", icon: ShieldCheck },
  { to: "/admin/content", label: "Content moderation", icon: ShieldCheck },
  { to: "/admin/operations", label: "Consultations & events", icon: LayoutDashboard },
  { to: "/admin/support", label: "Support & appeals", icon: Flag },
  { to: "/admin/announcements", label: "Announcements", icon: Flag },
  { to: "/admin/adverts", label: "Adverts", icon: Flag },
  { to: "/admin/audit", label: "Staff audit history", icon: ShieldCheck },
  { to: "/admin/platform", label: "Platform health & settings", icon: ShieldCheck },
];

export default function AdminLayout({ children, loading = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const moderator = user?.role === "moderator";
  const navigation = moderator ? [
    ...(hasStaffPermission(user, "users.read") ? [{ to: "/moderator", label: "Users", icon: Users }] : []),
    ...(hasStaffPermission(user, "analytics.read") ? [{ to: "/moderator/analytics", label: "Site analytics", icon: BarChart3 }] : []),
    ...(hasStaffPermission(user, "reports.read") ? [{ to: "/moderator/reports", label: "Reports & complaints", icon: Flag }] : []),
    ...(hasStaffPermission(user, "content.read") ? [{ to: "/moderator/content", label: "Content moderation", icon: ShieldCheck }] : []),
  ] : links;
  return (
    <div className="min-h-screen bg-brand-ivory text-brand-navy lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-brand-navy/10 bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand-gold"><ShieldCheck size={22} aria-hidden="true" /></div>
          <div><p className="text-xl font-bold">ElitePlan</p><p className="text-xs text-gray-500">{moderator ? "Moderator portal" : "Admin portal"}</p></div>
        </div>
        <nav aria-label={moderator ? "Moderator navigation" : "Admin navigation"} className="mt-5 space-y-2 lg:mt-8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/admin" || item.to === "/admin/analytics" || item.to === "/moderator"} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${focus} ${isActive || (item.to === "/moderator" && pathname.startsWith("/moderator/users/")) ? "bg-brand-navy text-white" : "text-brand-charcoal hover:bg-brand-ivory"}`}>
                <Icon size={18} aria-hidden="true" />{item.label}
              </NavLink>
            );
          })}
        </nav>
        <Link to="/logout" className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-brand-charcoal hover:bg-brand-ivory ${focus}`}><LogOut size={18} aria-hidden="true" /> Sign out</Link>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 lg:p-10" aria-busy={loading}>{children}</main>
    </div>
  );
}
