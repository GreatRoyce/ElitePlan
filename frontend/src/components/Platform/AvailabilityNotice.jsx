export default function AvailabilityNotice({ availability, registration = false, role }) {
  const { data, loading, error, refresh } = availability;
  const paused = registration ? ["client", "vendor", "planner"].filter((v) => data?.registration[v] === false && (!role || role === v)) : data?.consultationsEnabled === false;
  if (!loading && !error && (registration ? paused.length === 0 : !paused)) return null;
  return <div role={error ? "alert" : "status"} className="my-4 rounded-xl border border-brand-navy/10 bg-brand-ivory p-4 text-sm text-brand-navy">
    {loading ? "Checking service availability..." : error || (registration ? `New ${paused.join(", ")} registrations are temporarily paused. Please try again later.` : "New consultation requests are temporarily paused. Please try again later.")}
    {!loading && <button type="button" onClick={refresh} className="ml-3 rounded underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">Check again</button>}
  </div>;
}
