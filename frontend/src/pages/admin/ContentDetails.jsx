import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import AdminLayout from "./AdminLayout";
import ContentActions from "./ContentActions";
import api, { getApiErrorMessage } from "../../utils/axios";
import { hasStaffPermission } from "../../utils/staffAccess";
import {
  profileLink,
  verificationFocus as focus,
  verificationDate as date,
} from "../../utils/profileVerification";

export function ContentSnapshot({ content, reviews }) {
  const media = [
    ["Profile image", content.profileImage],
    ["Intro video", content.introVideo],
    ["Website", content.website],
    ["WhatsApp", content.whatsappLink],
    ...Object.entries(content.socialLinks || {}),
    ...(content.gallery || []).map((value, index) => [
      `Gallery ${index + 1}`,
      value,
    ]),
    ...(content.portfolioImages || []).map((value, index) => [
      `Portfolio ${index + 1}`,
      value,
    ]),
  ]
    .map(([label, value]) => [label, profileLink(value)])
    .filter(([, url]) => url);
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Current published content</h2>
      <dl className="mt-4 divide-y divide-gray-100">
        {Object.entries(content).map(([key, value]) => (
          <div
            key={key}
            className="grid gap-2 py-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)]"
          >
            <dt className="break-words text-gray-500">
              {key.replace(/([A-Z])/g, " $1")}
            </dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words">
              {typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value ?? "Not provided")}
            </dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-5 font-semibold">Media and links</h3>
      <p className="mt-2 text-xs text-gray-500">
        Open submitted links to inspect media. Hiding a listing removes its
        public listing references; existing upload URLs remain accessible.
      </p>
      {media.length ? (
        <ul className="mt-3 flex flex-wrap gap-3">
          {media.map(([label, url], index) => (
            <li key={index}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded text-sm capitalize underline ${focus}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          No supported media links provided.
        </p>
      )}
      {reviews.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold">Published reviews</h3>
          <ul className="mt-3 divide-y divide-gray-100">
            {reviews.map((entry, index) => (
              <li key={index} className="py-3 text-sm">
                <p>Rating: {entry.rating}/5</p>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {entry.comment}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default function ContentDetails() {
  const { user } = useAuth(),
    { type, profileId } = useParams();
  const base = user?.role === "moderator" ? "/moderator" : "/admin",
    key = `${type}:${profileId}`;
  const [result, setResult] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(null);
  const request = useRef(null),
    data = result?.key === key ? result.data : null;
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(
        `/admin/content/${encodeURIComponent(type)}/${encodeURIComponent(profileId)}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted)
        setResult({ key: `${type}:${profileId}`, data: response.data.data });
    } catch (failure) {
      if (!controller.signal.aborted) {
        setResult(null);
        setError(
          getApiErrorMessage(failure, "Unable to load listing content."),
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [type, profileId]);
  useEffect(() => {
    load();
    return () => request.current?.abort();
  }, [load]);
  return (
    <AdminLayout loading={loading}>
      <Link
        to={`${base}/content`}
        className={`rounded text-sm underline ${focus}`}
      >
        Back to content queue
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <h1 className="break-words text-2xl font-bold sm:text-3xl">
          {data?.profile.name || "Content review"}
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className={`rounded-lg bg-white px-4 py-2 text-sm disabled:opacity-40 ${focus}`}
        >
          Refresh
        </button>
      </div>
      {notice?.key === key && (
        <p
          role={notice.error ? "alert" : "status"}
          className="mt-5 rounded-xl bg-white p-4 text-sm"
        >
          {notice.message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading && !data && (
        <p role="status" className="mt-5 text-sm">
          Loading content...
        </p>
      )}
      {data && (
        <>
          <section className="mt-6 rounded-2xl bg-white p-5">
            <p className="font-semibold">
              {data.moderation.hidden ? "Hidden listing" : "Published listing"}
            </p>
            <p className="mt-2 text-sm">
              Owner: {data.owner.username} · Account access:{" "}
              {data.owner.accountStatus}
            </p>
            {data.moderation.reason && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                Latest decision: {data.moderation.reason}
              </p>
            )}
            {hasStaffPermission(user, "users.read") && (
              <Link
                to={`${base}/users/${data.owner._id}`}
                className={`mt-3 inline-block rounded text-sm underline ${focus}`}
              >
                View owner account
              </Link>
            )}
          </section>
          <ContentSnapshot content={data.content} reviews={data.reviews} />
          <ContentActions
            key={`${key}:${data.moderation.version}`}
            data={data}
            disabled={loading || Boolean(error)}
            onChanged={async (message) => {
              setNotice({ ...message, key });
              await load();
            }}
          />
          <section className="mt-6 rounded-2xl bg-white p-5">
            <h2 className="text-lg font-semibold">
              Content moderation history
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              The most recent 100 visibility decisions are retained.
            </p>
            {data.moderation.history.length ? (
              <ul className="mt-4 divide-y divide-gray-100">
                {data.moderation.history.map((entry) => (
                  <li key={entry._id} className="py-4">
                    <p className="text-sm font-semibold">
                      {entry.action === "hide"
                        ? "Listing hidden"
                        : "Listing restored"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {entry.reason}
                    </p>
                    <p className="mt-2 break-all text-xs text-gray-500">
                      {date(entry.at)} (Lagos) · Staff ID: {entry.by}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                No recorded visibility decisions.
              </p>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}
