import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import api, { getApiErrorMessage } from "../../utils/axios";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/authStore";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
const field = `min-w-0 rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm ${focus}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "Unavailable";
const number = (value) => new Intl.NumberFormat().format(value);

function UserFilters({ initial, onApply, onReset, disabled, archived, moderator, moderators }) {
  const [draft, setDraft] = useState(initial);
  function submit(event) {
    event.preventDefault();
    onApply({ ...draft, search: draft.search.trim(), page: "1" });
  }
  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-4 sm:p-5">
      <fieldset disabled={disabled} className="flex flex-wrap items-end gap-3">
        <legend className="sr-only">Filter users</legend>
        <label className="flex min-w-0 flex-1 basis-60 flex-col gap-2 text-xs font-medium">Search accounts<input type="search" value={draft.search} maxLength={100} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Name, email, or phone" className={field} /></label>
        <label className="flex flex-col gap-2 text-xs font-medium">Role<select value={draft.role} disabled={moderators} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className={field}>{(moderators ? [["moderator", "Moderators"]] : [["all", "All roles"], ["client", "Clients"], ["vendor", "Vendors"], ["planner", "Planners"], ...(!moderator ? [["admin", "Admins"], ["moderator", "Moderators"]] : [])]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-xs font-medium">{archived ? "Retained access status" : "Account status"}<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className={field}>{[["all", "All statuses"], ["active", "Active"], ["suspended", "Suspended"], ["banned", "Banned"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-xs font-medium">Sort<select value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value })} className={field}>{[["newest", "Newest first"], ["oldest", "Oldest first"], ["name", "Name A–Z"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-xs font-medium">Per page<select value={draft.pageSize} onChange={(event) => setDraft({ ...draft, pageSize: event.target.value })} className={field}>{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <button type="submit" className={`inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${focus}`}><Search size={16} aria-hidden="true" />Search</button>
        <button type="button" onClick={onReset} className={`rounded-lg px-3 py-2 text-sm text-brand-charcoal hover:bg-brand-ivory disabled:opacity-60 ${focus}`}>Reset</button>
      </fieldset>
    </form>
  );
}

export default function AdminUsers({ archived = false, moderators = false }) {
  const { user } = useAuth();
  const moderator = user?.role === "moderator";
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const request = useRef(null);
  const data = result?.query === query ? result.data : null;

  const loadUsers = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(archived ? "/admin/archive" : "/admin/users", { params: { ...Object.fromEntries(new URLSearchParams(query)), ...(moderators ? { role: "moderator" } : {}) }, signal: controller.signal });
      if (!controller.signal.aborted) setResult({ query, data: response.data.data });
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure.response?.status === 403) { setForbidden(true); setResult(null); }
      setError(getApiErrorMessage(failure, "Unable to load users. Please try again."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [query, archived, moderators]);

  useEffect(() => {
    loadUsers();
    return () => request.current?.abort();
  }, [loadUsers]);

  function changePage(page) {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    setParams(next);
  }

  return (
    <AdminLayout loading={loading}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-royal">{moderators ? "Staff" : "Community"}</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{archived ? "Removed users" : moderators ? "Moderators" : "Users"}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-charcoal">{archived ? "Saved accounts removed from the site. Open a record to review the removal or restore the account." : moderators ? "Review moderators, update their permissions, or revoke their access. To appoint someone, open an active account from Users." : moderator ? "Review member accounts and take the actions assigned to you by an admin." : "Find accounts and review their profiles and platform activity."}</p>{moderators && <Link to="/admin/users" className={`mt-3 inline-block rounded text-sm font-medium text-brand-royal ${focus}`}>Find an account to appoint</Link>}</div>
        <button type="button" onClick={loadUsers} disabled={loading || forbidden} className={`inline-flex items-center gap-2 rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 ${focus}`}><RefreshCw size={16} aria-hidden="true" className={loading ? "motion-safe:animate-spin" : ""} />{loading ? "Loading..." : "Refresh"}</button>
      </header>
      <UserFilters key={query} initial={{ search: params.get("search") || "", role: moderators ? "moderator" : params.get("role") || "all", status: params.get("status") || "all", sort: params.get("sort") || "newest", pageSize: params.get("pageSize") || "25" }} onApply={setParams} onReset={() => setParams({})} disabled={forbidden} archived={archived} moderator={moderator} moderators={moderators} />
      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{data && <p className="mt-1">The list below is from the last successful update.</p>}</div>}
      {loading && !data && <p role="status" className="mt-8 text-sm text-gray-500">Loading accounts...</p>}
      {data && <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6" aria-label="User results">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{number(data.pagination.total)} {data.pagination.total === 1 ? "account" : "accounts"}</h2><p className="text-xs text-gray-500">{data.filters.role === "all" ? "All roles" : `${data.filters.role.charAt(0).toUpperCase()}${data.filters.role.slice(1)} accounts`}{data.filters.search && ` matching “${data.filters.search}”`}</p></div>
        {data.users.length === 0 ? <p role="status" className="mt-6 text-sm text-gray-500">No accounts match these filters.</p> : <>
          <div aria-hidden="true" className="mt-5 hidden grid-cols-[minmax(0,1fr)_100px_140px_180px] gap-4 border-b border-gray-100 pb-3 text-xs font-medium text-gray-500 md:grid"><span>Account</span><span>Role</span><span>{archived ? "Removed" : "Joined"} (Lagos time)</span><span>Actions</span></div>
          <ul className="mt-3 divide-y divide-gray-100 md:mt-0">{data.users.map((account) => <li key={account._id} className="grid items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_100px_140px_180px] md:gap-4">
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{account.username}</p><p className="mt-1 break-all text-xs text-gray-500">{account.email}</p></div>
            <div><span className="inline-block rounded-full bg-brand-ivory px-3 py-1 text-xs capitalize">{account.role}</span><p className={`mt-2 text-xs capitalize ${account.accountStatus === "active" ? "text-gray-500" : "font-medium text-red-700"}`}>{account.accountStatus}</p></div>
            <p className="text-xs text-gray-500"><span className="md:sr-only">{archived ? "Removed" : "Joined"} </span>{date(archived ? account.archivedAt : account.createdAt)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`${moderator ? "/moderator/users" : archived ? "/admin/archive" : "/admin/users"}/${account._id}${query || moderators ? `?${new URLSearchParams({ ...Object.fromEntries(params), ...(moderators ? { role: "moderator" } : {}) })}` : ""}`} aria-label={`View details for ${account.username}, ${account.email}`} className={`w-fit rounded-lg px-3 py-2 text-xs font-medium text-brand-royal hover:bg-brand-ivory ${focus}`}>View details</Link>
              {user?.role === "admin" && !archived && !account.archivedAt && ["client", "vendor", "planner"].includes(account.role) && account._id !== user.id && <Link to={`/admin/users/${account._id}${query ? `?${query}` : ""}#remove-account`} aria-label={`Remove user ${account.username}, ${account.email}`} className={`inline-flex rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 ${focus}`}>Remove user</Link>}
            </div>
          </li>)}</ul>
        </>}
        <nav aria-label="User result pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">{data.pagination.total ? `${number((data.pagination.page - 1) * data.pagination.pageSize + 1)}–${number(Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total))} of ${number(data.pagination.total)}` : "0 results"} · Page {number(data.pagination.page)} of {number(Math.max(1, data.pagination.totalPages))}</p>
          <div className="flex gap-2"><button type="button" onClick={() => changePage(data.pagination.page - 1)} disabled={loading || forbidden || data.pagination.page <= 1} className={`rounded-lg border border-brand-navy/15 px-3 py-2 text-xs hover:bg-brand-ivory disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}>Previous</button><button type="button" onClick={() => changePage(data.pagination.page + 1)} disabled={loading || forbidden || data.pagination.page >= data.pagination.totalPages} className={`rounded-lg border border-brand-navy/15 px-3 py-2 text-xs hover:bg-brand-ivory disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}>Next</button></div>
        </nav>
      </section>}
    </AdminLayout>
  );
}
