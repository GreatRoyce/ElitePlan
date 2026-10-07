import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { verificationLabels, verificationFocus, verificationInput, verificationDate } from "../../utils/profileVerification";

export default function ProfileVerification() {
  const [filters, setFilters] = useState({ type: "vendor", status: "unverified", search: "", sort: "oldest" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api.get("/admin/verification", { params: { ...filters, page }, signal: controller.signal }).then((response) => { if (active) { setData(response.data.data); setLoading(false); } }).catch((failure) => { if (active) { setError(getApiErrorMessage(failure, "Unable to load verification queue.")); setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [filters, page, retry]);
  function change(key, value) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); setData(null); setError(""); setLoading(true); }
  function refresh() { setData(null); setError(""); setLoading(true); setRetry((value) => value + 1); }
  function move(value) { setPage(value); setData(null); setLoading(true); }
  return <AdminLayout loading={loading}>
    <h1 className="text-2xl font-bold sm:text-3xl">Profile verification</h1>
    <p className="mt-2 text-sm text-brand-charcoal">Review vendor and planner profiles, record decisions, and manage verified badges.</p>
    <form onSubmit={(event) => { event.preventDefault(); change("search", search.trim()); }} className="mt-6 grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium">Profile type<select value={filters.type} onChange={(event) => change("type", event.target.value)} className={`mt-2 ${verificationInput}`}><option value="vendor">Vendors</option><option value="planner">Planners</option></select></label>
      <label className="text-xs font-medium">Verification status<select value={filters.status} onChange={(event) => change("status", event.target.value)} className={`mt-2 ${verificationInput}`}><option value="all">All statuses</option>{Object.entries(verificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs font-medium">Order<select value={filters.sort} onChange={(event) => change("sort", event.target.value)} className={`mt-2 ${verificationInput}`}><option value="oldest">Oldest update first</option><option value="newest">Newest update first</option></select></label>
      <label className="text-xs font-medium">Name or email<div className="mt-2 flex gap-2"><input maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} className={verificationInput} /><button className={`rounded-lg bg-brand-navy px-3 py-2 text-sm text-white ${verificationFocus}`}>Search</button></div></label>
    </form>
    <p className="mt-4 text-xs text-gray-500">Archived accounts and staff-owned profiles are excluded. Restricted accounts can be reviewed but cannot be approved.</p>
    {loading && <p role="status" className="mt-6 text-sm">Loading profiles…</p>}
    {error && <p role="alert" className="mt-6 text-sm text-red-700">{error}<button onClick={refresh} className={`ml-3 rounded underline ${verificationFocus}`}>Try again</button></p>}
    {!loading && !error && data && <div className="mt-6"><p className="mb-4 text-sm text-gray-500">{data.pagination.total} profiles</p>{data.profiles.length ? <ul className="space-y-3">{data.profiles.map((profile) => <li key={profile._id} className="rounded-2xl border border-brand-navy/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><Link to={`/admin/verification/${profile.type}/${profile._id}`} className={`break-words rounded font-semibold hover:underline ${verificationFocus}`}>{profile.organization || profile.name || "Professional profile"}</Link><span className="rounded-full bg-brand-ivory px-3 py-1 text-xs">{verificationLabels[profile.status]}</span></div><p className="mt-2 break-words text-sm text-brand-charcoal">{profile.name} · {profile.email || "No profile email"}</p><p className="mt-2 text-xs text-gray-500">Owner: {profile.owner.username} · Account {profile.owner.accountStatus}</p><p className="mt-2 text-xs text-gray-500">Updated {verificationDate(profile.updatedAt)} (Lagos time)</p></li>)}</ul> : <p className="rounded-xl bg-white p-5 text-sm">No profiles match these filters.</p>}<div className="mt-5 flex items-center justify-between gap-3 text-sm"><button disabled={data.pagination.page <= 1} onClick={() => move(data.pagination.page - 1)} className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${verificationFocus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}</span><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => move(data.pagination.page + 1)} className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${verificationFocus}`}>Next</button></div></div>}
  </AdminLayout>;
}
