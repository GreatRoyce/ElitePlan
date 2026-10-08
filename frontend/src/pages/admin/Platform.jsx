import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api, { getApiErrorMessage } from "../../utils/axios";
import { verificationDate as date } from "../../utils/profileVerification";
import { auditFocus as focus, auditInput as input } from "../../utils/staffAudit";

const button = `rounded-lg bg-brand-navy px-4 py-3 text-sm text-white disabled:opacity-40 ${focus}`;
const states = { healthy: "Checks passed", attention: "Needs attention", unavailable: "Unavailable" };
const labels = { database: "Database connection", uploads: "Upload storage", audit: "Staff audit completion", settings: "Platform settings", realtime: "Realtime connections", configuration: "Required configuration" };
const switches = (value) => ({ registration: { ...value.registration }, consultationsEnabled: value.consultationsEnabled });
const describe = (value) => ["client", "vendor", "planner"].map((role) => `${role} signup: ${value.registration[role] ? "open" : "paused"}`).concat(`new consultations: ${value.consultationsEnabled ? "open" : "paused"}`).join(" · ");

export function HealthSummary({ data, stale = false }) {
  return <section className="mt-5" aria-label="Health snapshot">
    <p className="text-sm"><strong>{stale ? "Previous snapshot · " : ""}{states[data.status]}</strong> · Checked {date(data.checkedAt)} (Lagos)</p>
    <p className="mt-2 text-xs text-gray-500">Uptime: {Math.floor(data.runtime.uptimeSeconds / 60)} minutes · Node {data.runtime.nodeVersion} · Process memory: {(data.runtime.memory.rssBytes / 1048576).toFixed(1)} MB · Heap used: {(data.runtime.memory.heapUsedBytes / 1048576).toFixed(1)} MB</p>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">{Object.entries(data.checks).map(([key, check]) => <article key={key} className="rounded-xl border border-brand-navy/10 bg-white p-5"><h3 className="font-semibold">{labels[key]}</h3><p className={`mt-2 text-sm font-medium ${check.status === "healthy" ? "text-green-800" : "text-amber-900"}`}>{states[check.status]}</p><p className="mt-2 text-sm text-gray-600">{check.message}</p>{check.latencyMs != null && <p className="mt-2 text-xs">Ping: {check.latencyMs} ms</p>}{check.connections != null && <p className="mt-2 text-sm">{check.connections} socket connections on this server</p>}{check.pendingOverFiveMinutes != null && <Link to="/admin/audit?outcome=pending" className={`mt-3 inline-block rounded text-sm underline ${focus}`}>{check.pendingOverFiveMinutes} pending over five minutes · Review audit history</Link>}{check.configured && <ul className="mt-3 space-y-1 text-sm">{Object.entries(check.configured).map(([name, configured]) => <li key={name} className="capitalize">{name}: {configured ? "Configured" : "Missing"}</li>)}</ul>}</article>)}</div>
  </section>;
}

export function SettingsEditor({ settings, busy = false, blocked = false, onSave }) {
  const [draft, setDraft] = useState(() => switches(settings)), [note, setNote] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(switches(settings));
  const submit = (event) => { event.preventDefault(); if (!busy && !blocked && dirty && note.trim()) onSave({ ...draft, expectedVersion: settings.version, note: note.trim() }); };
  return <form onSubmit={submit} className="mt-5 rounded-xl bg-white p-5">
    <p className="text-sm text-gray-500">Revision {settings.version} · Last saved: {date(settings.updatedAt)} (Lagos)</p>
    <fieldset disabled={busy || blocked} className="mt-5 space-y-4"><legend className="mb-3 font-semibold">Accept new signups</legend>{["client", "vendor", "planner"].map((role) => <label key={role} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.registration[role]} onChange={(e) => setDraft((v) => ({ ...v, registration: { ...v.registration, [role]: e.target.checked } }))} className={`h-4 w-4 accent-brand-navy ${focus}`} /><span className="capitalize">{role} accounts</span></label>)}</fieldset>
    <label className="mt-6 flex items-center gap-3 text-sm"><input type="checkbox" disabled={busy || blocked} checked={draft.consultationsEnabled} onChange={(e) => setDraft((v) => ({ ...v, consultationsEnabled: e.target.checked }))} className={`h-4 w-4 accent-brand-navy ${focus}`} />Accept new consultation requests</label>
    <p className="mt-4 text-sm text-gray-600">Changes apply to new submissions. Existing accounts can sign in and continue their work, including reviewing current consultations and contacting support.</p>
    <label className="mt-5 block text-sm">Reason for this change (private)<textarea required maxLength={1000} value={note} disabled={busy || blocked} onChange={(e) => setNote(e.target.value)} className={input} rows={3} /></label>
    <button type="submit" disabled={busy || blocked || !dirty || !note.trim()} className={`mt-4 ${button}`}>{busy ? "Saving settings..." : "Save settings"}</button>
  </form>;
}

export function SettingsHistory({ history }) {
  return <section className="mt-6"><h3 className="text-lg font-semibold">Recent settings changes</h3>{history.length ? <ol className="mt-4 space-y-3">{[...history].reverse().map((h) => <li key={h.version} className="rounded-xl bg-white p-5 text-sm"><p className="font-semibold">Revision {h.version} · {date(h.at)} (Lagos)</p><p className="mt-2 break-words text-xs text-gray-500">Staff account: {h.by}</p><p className="mt-3">Before: {describe(h.before)}</p><p className="mt-2">After: {describe(h.after)}</p><p className="mt-3 whitespace-pre-wrap break-words">{h.note}</p></li>)}</ol> : <p className="mt-3 text-sm text-gray-500">No settings changes have been saved yet. All new registrations and consultations are open by default.</p>}<Link to="/admin/audit?category=settings" className={`mt-4 inline-block rounded text-sm underline ${focus}`}>View full settings audit history</Link></section>;
}

export default function Platform() {
  const [health, setHealth] = useState(null), [healthBusy, setHealthBusy] = useState(true), [healthError, setHealthError] = useState("");
  const [settings, setSettings] = useState(null), [settingsBusy, setSettingsBusy] = useState(true), [settingsError, setSettingsError] = useState(""), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  const requests = useRef({}), saveRequest = useRef(null);
  const loadHealth = useCallback(async () => {
    requests.current.health?.abort(); const controller = new AbortController(); requests.current.health = controller; setHealthBusy(true); setHealthError("");
    try { const r = await api.get("/admin/platform/health", { signal: controller.signal, timeout: 10000 }); if (!controller.signal.aborted) setHealth(r.data.data); }
    catch (e) { if (!controller.signal.aborted) setHealthError(getApiErrorMessage(e)); }
    finally { if (!controller.signal.aborted) setHealthBusy(false); }
  }, []);
  const loadSettings = useCallback(async () => {
    requests.current.settings?.abort(); const controller = new AbortController(); requests.current.settings = controller; setSettingsBusy(true); setSettingsError(""); setMessage("");
    try { const r = await api.get("/admin/platform/settings", { signal: controller.signal, timeout: 10000 }); if (!controller.signal.aborted) setSettings({ ...r.data.data, loaded: Date.now() }); }
    catch (e) { if (!controller.signal.aborted) setSettingsError(getApiErrorMessage(e)); }
    finally { if (!controller.signal.aborted) setSettingsBusy(false); }
  }, []);
  useEffect(() => {
    loadHealth(); loadSettings();
    const current = requests.current;
    return () => { current.health?.abort(); current.settings?.abort(); saveRequest.current?.abort(); };
  }, [loadHealth, loadSettings]);
  const save = async (body) => {
    if (saveRequest.current) return;
    const controller = new AbortController(); saveRequest.current = controller; setSaving(true); setSettingsError(""); setMessage("");
    try {
      const r = await api.patch("/admin/platform/settings", body, { signal: controller.signal, timeout: 10000 });
      if (!controller.signal.aborted) { setSettings({ ...r.data.data, loaded: Date.now() }); setMessage(r.data.message); loadHealth(); }
    } catch (e) { if (!controller.signal.aborted) setSettingsError(`${getApiErrorMessage(e)} Reload settings and review the audit history before saving again.`); }
    finally { if (!controller.signal.aborted) { setSaving(false); saveRequest.current = null; } }
  };
  return <AdminLayout loading={healthBusy || settingsBusy || saving}>
    <h1 className="text-3xl font-bold">Platform health & settings</h1><p className="mt-3 max-w-2xl text-sm text-gray-600">Check the services on this server and control new member activity. Health checks show a snapshot at the time requested.</p>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Platform health</h2><button onClick={loadHealth} disabled={healthBusy} className={button}>Refresh health</button></div>
    {healthBusy && <p role="status" className="mt-4 text-sm">Checking platform health...</p>}{healthError && <p role="alert" className="mt-4 text-sm text-red-700">{healthError}{health && " The previous snapshot is stale."}</p>}{health && <HealthSummary data={health} stale={Boolean(healthError || healthBusy)} />}
    <div className="mt-10 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Availability settings</h2><button onClick={loadSettings} disabled={settingsBusy || saving} className={button}>Reload settings (discards unsaved edits)</button></div>
    {settingsBusy && <p role="status" className="mt-4 text-sm">Loading platform settings...</p>}{settingsError && <p role="alert" className="mt-4 text-sm text-red-700">{settingsError}</p>}{message && <p role="status" className="mt-4 rounded-xl bg-brand-ivory p-4 text-sm">{message}</p>}{settings && <><SettingsEditor key={`${settings.version}-${settings.loaded}`} settings={settings} busy={saving || settingsBusy} blocked={Boolean(settingsError)} onSave={save} /><SettingsHistory history={settings.history} /></>}
  </AdminLayout>;
}
