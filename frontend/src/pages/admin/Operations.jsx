import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { operationTypes, operationStatuses } from "../../utils/operations";
import {
  verificationInput as input,
  verificationFocus as focus,
  verificationDate as date,
} from "../../utils/profileVerification";

export function OperationsList({ data }) {
  return data.records.length ? (
    <ul className="mt-4 space-y-3">
      {data.records.map((r) => (
        <li
          key={`${r.type}:${r._id}`}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5"
        >
          <div className="min-w-0">
            <h2 className="break-words font-semibold">
              {r.title || "Untitled record"}
            </h2>
            <p className="mt-2 text-sm capitalize">
              {r.status}
              {r.flagged && (
                <span className="ml-3 rounded bg-amber-100 px-2 py-1 text-xs text-amber-950">
                  Flagged
                </span>
              )}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Scheduled: {date(r.date)} (Lagos)
            </p>
            {r.attention && (
              <p className="mt-2 text-xs text-amber-800">
                {r.type === "consultations"
                  ? "Pending for more than 7 days"
                  : "Active event with a past scheduled date"}
              </p>
            )}
          </div>
          <Link
            to={`/admin/operations/${r.type}/${r._id}`}
            className={`rounded-lg border border-brand-navy/20 px-4 py-2 text-sm ${focus}`}
          >
            Review record
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-4 rounded-xl bg-white p-5 text-sm">
      No records match these filters.
    </p>
  );
}
export default function Operations() {
  const [params, setParams] = useSearchParams(),
    query = params.toString();
  const [result, setResult] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [typeDraft, setTypeDraft] = useState(null);
  const selectedType =
    typeDraft?.key === query
      ? typeDraft.type
      : params.get("type") || "consultations";
  const data = result?.key === query ? result.data : null;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get(`/admin/operations${query ? `?${query}` : ""}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({ key: query, data: response.data.data });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(
            getApiErrorMessage(failure, "Unable to load operations records."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, reload]);
  function apply(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setParams(
      Object.fromEntries(
        ["type", "status", "flagged", "from", "to", "search"].map((key) => [
          key,
          values.get(key),
        ]),
      ),
    );
  }
  function move(page) {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    setParams(next);
  }
  return (
    <AdminLayout loading={loading}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Consultation & event oversight
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            Review requests and both event sources. Track follow-up work and
            record administrative status changes with a reason.
          </p>
        </div>
        <button
          onClick={() => setReload((v) => v + 1)}
          disabled={loading}
          className={`rounded-lg bg-white px-4 py-2 text-sm disabled:opacity-40 ${focus}`}
        >
          Refresh
        </button>
      </div>
      <form
        key={query}
        onSubmit={apply}
        className="mt-6 grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <label className="text-xs font-medium">
          Record source
          <select
            name="type"
            defaultValue={params.get("type") || "consultations"}
            onChange={(e) => setTypeDraft({ key: query, type: e.target.value })}
            className={`mt-2 ${input}`}
          >
            {Object.entries(operationTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Status
          <select
            key={selectedType}
            name="status"
            defaultValue={
              (params.get("type") || "consultations") === selectedType
                ? params.get("status") || "all"
                : "all"
            }
            className={`mt-2 ${input}`}
          >
            <option value="all">All statuses</option>
            {(selectedType === "consultations"
              ? operationStatuses.consultations
              : operationStatuses.events
            ).map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Follow-up flag
          <select
            name="flagged"
            defaultValue={params.get("flagged") || "all"}
            className={`mt-2 ${input}`}
          >
            <option value="all">All records</option>
            <option value="yes">Flagged</option>
            <option value="no">Not flagged</option>
          </select>
        </label>
        <label className="text-xs font-medium">
          Scheduled from (Lagos)
          <input
            type="date"
            name="from"
            defaultValue={params.get("from") || ""}
            className={`mt-2 ${input}`}
          />
        </label>
        <label className="text-xs font-medium">
          Scheduled through (Lagos)
          <input
            type="date"
            name="to"
            defaultValue={params.get("to") || ""}
            className={`mt-2 ${input}`}
          />
        </label>
        <label className="text-xs font-medium">
          Event title or consultation type
          <input
            name="search"
            maxLength={100}
            defaultValue={params.get("search") || ""}
            className={`mt-2 ${input}`}
          />
        </label>
        <button
          className={`w-fit rounded-lg bg-brand-navy px-4 py-2.5 text-sm text-white ${focus}`}
        >
          Apply filters
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="mt-5 text-sm">
          Loading operations...
        </p>
      )}
      {data && !loading && !error && (
        <section className="mt-6">
          <p className="text-sm text-gray-500">
            {data.pagination.total} records ·{" "}
            {operationTypes[data.filters.type]}
          </p>
          <OperationsList data={data} />
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <button
              disabled={data.pagination.page <= 1}
              onClick={() => move(data.pagination.page - 1)}
              className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${focus}`}
            >
              Previous
            </button>
            <span>
              Page {data.pagination.page} of{" "}
              {Math.max(1, data.pagination.totalPages)}
            </span>
            <button
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => move(data.pagination.page + 1)}
              className={`rounded-lg bg-white px-4 py-2 disabled:opacity-40 ${focus}`}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
