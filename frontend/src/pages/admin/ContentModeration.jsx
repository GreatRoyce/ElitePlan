import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { verificationInput as input, verificationFocus as focus, verificationDate as date } from "../../utils/profileVerification";

export default function ContentModeration() {
  const { user } = useAuth();
  const base = user?.role === "moderator" ? "/moderator/content" : "/admin/content";
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [result, setResult] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const request = useRef(null);
  const data = result?.key === query ? result.data : null;
  useEffect(() => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    api.get(`/admin/content${query ? `?${query}` : ""}`, { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) setResult({ key: query, data: response.data.data });
    }).catch((failure) => {
      if (!controller.signal.aborted) { setResult(null); setError(getApiErrorMessage(failure, "Unable to load published content.")); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, reload]);
  function filter(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setParams({ type: values.get("type"), status: values.get("status"), search: values.get("search").trim(), page: "1" });
  }
  function move(page) { const next = new URLSearchParams(params); next.set("page", String(page)); setParams(next); }
  return <AdminLayout loading={loading}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold sm:text-3xl">Content moderation</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">Review vendor and planner listings, including their text, links, and media. Hide inappropriate listings while preserving their content for review.</p></div><button onClick={() => setReload((value) => value + 1)} disabled={loading} className={`rounded-lg bg-white px-4 py-2 text-sm disabled:opacity-50 ${focus}`}>Refresh</button></div>
    <form key={query} onSubmit={filter} className="mt-6 grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_auto]"><label className="text-xs font-medium">Profile type<select name="type" defaultValue={params.get("type") || "vendor"} className={`mt-2 ${input}`}><option value="vendor">Vendors</option><option value="planner">Planners</option></select></label><label className="text-xs font-medium">Visibility<select name="status" defaultValue={params.get("status") || "all"} className={`mt-2 ${input}`}><option value="all">All listings</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label><label className="text-xs font-medium">Search<input name="search" maxLength={100} defaultValue={params.get("search") || ""} placeholder="Business, company, or owner name" className={`mt-2 ${input}`} /></label><button className={`self-end rounded-lg bg-brand-navy px-4 py-2.5 text-sm text-white ${focus}`}>Apply filters</button></form>
    {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="mt-5 text-sm">Loading listings...</p>}
    {data && !loading && !error && <section className="mt-6"><p className="text-sm text-gray-500">{data.pagination.total} listings</p>{data.profiles.length ? <ul className="mt-4 space-y-3">{data.profiles.map((profile) => <li key={profile._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5"><div className="min-w-0"><h2 className="break-words font-semibold">{profile.name}</h2><p className="mt-1 break-words text-sm text-gray-500">{profile.owner.username} · {profile.hidden ? "Hidden" : "Published"}</p><p className="mt-1 text-xs text-gray-500">Last edit: {date(profile.updatedAt)} (Lagos)</p></div><Link to={`${base}/${profile.type}/${profile._id}`} className={`rounded-lg border border-brand-navy/20 px-4 py-2 text-sm ${focus}`}>Review content</Link></li>)}</ul> : <p className="mt-4 rounded-xl bg-white p-5 text-sm">No listings match these filters.</p>}<div className="mt-5 flex flex-wrap items-center gap-4 text-sm"><button disabled={data.pagination.page <= 1} onClick={() => move(data.pagination.page - 1)} className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${focus}`}>Previous</button><span>Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}</span><button disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => move(data.pagination.page + 1)} className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${focus}`}>Next</button></div></section>}
  </AdminLayout>;
}
