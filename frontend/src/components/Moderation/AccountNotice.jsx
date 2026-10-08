import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import { getApiErrorMessage } from "../../utils/axios";
import { getRealtimeClient, releaseRealtimeClient } from "../../utils/realtime";

export default function AccountNotice() {
  const { user, authNotice, acknowledgeWarning } = useAuth();
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState("");
  const userId = user?.id;
  const role = user?.role;
  const warning = user?.warning;

  useEffect(() => {
    if (!userId || !role) return;
    const socket = getRealtimeClient({ userId, role });
    const restricted = (notice) => window.dispatchEvent(new CustomEvent("auth:logout", { detail: { message: notice?.message || "Your account access has changed. Please sign in again." } }));
    const warned = (payload) => window.dispatchEvent(new CustomEvent("auth:warning", { detail: payload }));
    const connectionError = (failure) => {
      if (["ACCOUNT_ARCHIVED", "ACCOUNT_SUSPENDED", "ACCOUNT_BANNED", "SESSION_REVOKED"].includes(failure.data?.code)) restricted(failure.data);
    };
    socket.on("account_restricted", restricted);
    socket.on("account_warning", warned);
    socket.on("connect_error", connectionError);
    return () => {
      socket.off("account_restricted", restricted);
      socket.off("account_warning", warned);
      socket.off("connect_error", connectionError);
      releaseRealtimeClient({ userId, role });
    };
  }, [userId, role]);

  async function acknowledge() {
    setAcknowledging(true);
    setError("");
    try { await acknowledgeWarning(warning.id); }
    catch (failure) { setError(getApiErrorMessage(failure, "Unable to acknowledge the warning. Please try again.")); }
    finally { setAcknowledging(false); }
  }

  if (!authNotice && !warning) return null;
  return <div className="relative z-[60] border-b border-amber-200 bg-amber-50 px-5 py-4 text-sm text-brand-navy">
    {authNotice ? <p role="alert" className="mx-auto max-w-5xl break-words">{authNotice}</p> : <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-3" role="status">
      <div className="min-w-0 flex-1"><p className="font-semibold">Account warning</p><p className="mt-1 whitespace-pre-wrap break-words">{warning.reason}</p>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>
      <button type="button" onClick={acknowledge} disabled={acknowledging} className="rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-xs font-medium disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">{acknowledging ? "Saving..." : "Acknowledge warning"}</button>
    </div>}
    <Link to="/support" className="mx-auto mt-2 block max-w-5xl rounded underline focus-visible:ring-2 focus-visible:ring-brand-gold">Contact support or appeal a restriction</Link>
  </div>;
}
