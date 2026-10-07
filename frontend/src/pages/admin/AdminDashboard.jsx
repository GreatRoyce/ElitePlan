import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../../context/authStore";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../utils/axios";
import AdminLayout from "./AdminLayout";

const number = (value) => new Intl.NumberFormat().format(value);
const dateTime = (value) => value ? new Date(value).toLocaleString() : "Unavailable";
const roleLabels = { client: "Clients", vendor: "Vendors", planner: "Planners" };
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-5">
      <p className="text-sm text-brand-charcoal">{label}</p>
      <p className="mt-3 text-3xl font-bold text-brand-navy">{number(value)}</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{detail}</p>
    </div>
  );
}

function StatusList({ title, counts, statuses }) {
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      <dl className="mt-4 divide-y divide-gray-100">
        {statuses.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-brand-charcoal">{label}</dt>
            <dd className="font-semibold text-brand-navy">{number(counts[key] || 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const request = useRef(null);

  const loadOverview = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/overview", { signal: controller.signal });
      if (!controller.signal.aborted) setOverview(response.data.data);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure.response?.status === 403) {
        setForbidden(true);
        setOverview(null);
      }
      setError(getApiErrorMessage(failure, "Unable to load the overview. Please try again."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    return () => request.current?.abort();
  }, [loadOverview]);

  return (
    <AdminLayout loading={loading}>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-royal">Platform overview</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome, <span className="break-words">{user.username}</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-charcoal">An overview of your community, consultations, and events.</p>
          </div>
          <button type="button" onClick={loadOverview} disabled={loading || forbidden} className={`inline-flex items-center gap-2 rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`}>
            <RefreshCw size={16} aria-hidden="true" className={loading ? "motion-safe:animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {forbidden ? "Your account no longer has admin access. Sign out and sign in again." : error}
            {overview && <p className="mt-1">The figures below are from the last successful update.</p>}
          </div>
        )}
        {loading && !overview && <p role="status" className="mt-10 text-sm text-gray-500">Loading platform activity...</p>}

        {overview && (
          <>
            <p className="mt-6 text-xs text-gray-500">Updated {dateTime(overview.generatedAt)}</p>
            <section aria-label="Platform totals" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Registered users" value={overview.users.total} detail="Clients, vendors, and planners; staff excluded." />
              <Metric label="New users" value={overview.users.newLast7Days} detail="Registrations in the last 7 days." />
              <Metric label="Consultations" value={overview.consultations.total} detail={`${number(overview.consultations.byStatus.pending || 0)} currently pending.`} />
              <Metric label="Events" value={overview.events.total} detail={`${number(overview.events.byStatus.Upcoming || 0)} upcoming events.`} />
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Users size={20} aria-hidden="true" /> Community</h2>
                <dl className="mt-5 space-y-5">
                  {Object.entries(roleLabels).map(([role, label]) => {
                    const count = overview.users.byRole[role];
                    const percentage = overview.users.total ? Math.round(count / overview.users.total * 100) : 0;
                    return (
                      <div key={role}>
                        <div className="flex justify-between gap-4 text-sm">
                          <dt>{label}</dt><dd className="font-semibold">{number(count)} <span className="font-normal text-gray-500">({percentage}%)</span></dd>
                        </div>
                        <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-brand-gold" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </dl>
                <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">Administrator accounts: {number(overview.users.adminCount)}</p>
              </section>
              <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20} aria-hidden="true" /> Profile verification</h2>
                <Link to="/admin/verification" className={`mt-3 inline-block rounded text-sm underline ${focus}`}>Review professional profiles</Link>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">Stored professional profiles without a verified badge, including retained records.</p>
                <dl className="mt-5 divide-y divide-gray-100">
                  <div className="flex justify-between gap-4 py-3 text-sm"><dt>Vendor profiles</dt><dd className="font-semibold">{number(overview.profiles.unverifiedVendors)}</dd></div>
                  <div className="flex justify-between gap-4 py-3 text-sm"><dt>Planner profiles</dt><dd className="font-semibold">{number(overview.profiles.unverifiedPlanners)}</dd></div>
                </dl>
                <p className="mt-5 rounded-xl bg-brand-ivory p-3 text-xs leading-relaxed text-gray-500">Use the verification queue to approve, reject, or revoke a badge. Review inappropriate listing content separately.</p>
                <Link to="/admin/content" className={`mt-3 inline-block rounded text-sm underline ${focus}`}>Open content moderation</Link>
              </section>
              <StatusList title="Consultation activity" counts={overview.consultations.byStatus} statuses={[["pending", "Pending"], ["approved", "Approved"], ["declined", "Declined"], ["completed", "Completed"]]} />
              <StatusList title="Event activity" counts={overview.events.byStatus} statuses={[["Upcoming", "Upcoming"], ["Ongoing", "Ongoing"], ["Completed", "Completed"], ["Cancelled", "Cancelled"]]} />
            </div>

            <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays size={20} aria-hidden="true" /> Latest registrations</h2>
              <p className="mt-2 text-xs text-gray-500">The eight most recent client, vendor, and planner accounts.</p>
              {overview.users.recent.length === 0 ? <p className="mt-6 text-sm text-gray-500">No users have registered yet.</p> : (
                <ul className="mt-4 divide-y divide-gray-100">
                  {overview.users.recent.map((member) => (
                    <li key={member._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="min-w-0"><p className="break-words text-sm font-medium">{member.username}</p><p className="mt-1 text-xs capitalize text-gray-500">{member.role}</p></div>
                      <p className="text-xs text-gray-500">{dateTime(member.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
    </AdminLayout>
  );
}
