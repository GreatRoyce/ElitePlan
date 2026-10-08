import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import supportApi, { setSupportToken, supportToken, supportFocus as focus, supportInput as input, supportButton as button } from "../../utils/support";
import { getApiErrorMessage } from "../../utils/axios";
import SupportQueue from "./SupportQueue";
import NewSupportRequest from "./NewSupportRequest";
import SupportDetails from "./SupportDetails";

export function SupportSignIn({ onSignedIn, message }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { const r = await supportApi.post("/support/session", { email, password }); setSupportToken(r.data.token); setPassword(""); await onSignedIn(); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-6 max-w-lg space-y-5 rounded-2xl bg-white p-6"><h2 className="text-xl font-semibold">Sign in to support</h2><p className="text-sm leading-relaxed">Use your member account email and password. Suspended, banned, and archived members can sign in here to request help or appeal. This session lasts 30 minutes and provides access to support.</p>{message && <p role="status" className="text-sm">{message}</p>}<label className="block text-sm">Email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label><label className="block text-sm">Password<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className={button}>{busy ? "Signing in..." : "Sign in to support"}</button><p className="text-xs text-gray-500">Staff review requests in the <Link to="/admin/support" className={`rounded underline ${focus}`}>admin support queue</Link>.</p></form>;
}
export default function SupportPortal() {
  const { ticketId } = useParams(), [params] = useSearchParams();
  const [session, setSession] = useState(null), [checking, setChecking] = useState(true), [message, setMessage] = useState("");
  const expired = useCallback(() => { setSupportToken(null); setSession(null); setMessage("Your support session ended. Sign in again to continue. Account restoration can also end a session."); }, []);
  const loadSession = useCallback(async () => {
    setChecking(true);
    try { const r = await supportApi.get("/support/me"); setSession(r.data.data); setMessage(""); }
    catch (e) { setSession(null); setSupportToken(null); setMessage(getApiErrorMessage(e)); }
    finally { setChecking(false); }
  }, []);
  useEffect(() => { if (supportToken()) loadSession(); else setChecking(false); }, [loadSession]);
  const create = params.get("new") === "1" || Boolean(params.get("appeal"));
  return <main className="min-h-screen bg-brand-ivory p-5 text-brand-navy sm:p-8"><div className="mx-auto max-w-5xl"><nav className="flex flex-wrap items-center gap-5 text-sm"><Link to="/login" className={`rounded underline ${focus}`}>Account sign-in</Link><Link to="/support" className={`rounded underline ${focus}`}>My support requests</Link>{session && <><Link to="/support?new=1" className={`rounded underline ${focus}`}>New request</Link><button onClick={() => { setSupportToken(null); setSession(null); setMessage("Signed out of support. Your dashboard session is managed separately."); }} className={`rounded underline ${focus}`}>Sign out of support</button></>}</nav><h1 className="mt-8 text-3xl font-bold">Support &amp; appeals</h1>{checking ? <p role="status" className="mt-5">Checking support session...</p> : !session ? <SupportSignIn message={message} onSignedIn={loadSession} /> : <><p className="mt-3 text-sm">{session.user.username} · Account: {session.user.accountStatus}</p>{ticketId ? <SupportDetails ticketId={ticketId} onExpired={expired} /> : create ? <NewSupportRequest options={session.appealOptions} onExpired={expired} /> : <SupportQueue onExpired={expired} />}</>}</div></main>;
}
