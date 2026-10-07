import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../utils/axios";
import { reportCategories, reportDate, reportFocus, reportInput } from "../../utils/reportLabels";
import ReportLayout from "./ReportLayout";
import ReportEvidence from "./ReportEvidence";

export default function NewReport() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const presetType = params.get("type");
  const presetId = params.get("targetId");
  const preset = ["account", "message", "consultation"].includes(presetType) && /^[a-f0-9]{24}$/i.test(presetId || "");
  const [type, setType] = useState(preset ? presetType : "general");
  const [targetId, setTargetId] = useState(preset ? presetId : "");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [context, setContext] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [contextError, setContextError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const submission = useRef(null);
  useEffect(() => {
    if (type !== "consultation" || preset) return;
    let active = true;
    api.get("/consultation/mine").then((response) => { if (active) setConsultations(Array.isArray(response.data) ? response.data : []); }).catch((failure) => { if (active) setContextError(getApiErrorMessage(failure, "Unable to load your consultations.")); });
    return () => { active = false; };
  }, [type, preset, reload]);
  useEffect(() => {
    if (type === "general" || !targetId) return;
    let active = true;
    const controller = new AbortController();
    api.get("/reports/context", { params: { type, targetId }, signal: controller.signal }).then((response) => { if (active) setContext(response.data.data); }).catch((failure) => { if (active) setContextError(getApiErrorMessage(failure, "Unable to load the reported item.")); });
    return () => { active = false; controller.abort(); };
  }, [type, targetId, reload]);
  function resetContext() { setContext(null); setContextError(""); setError(""); }
  async function submit(event) {
    event.preventDefault();
    if (saving || (type !== "general" && !context)) return;
    const payload = { type, category, subject: subject.trim(), details: details.trim(), ...(type !== "general" ? { targetId } : {}) };
    if (payload.subject.length < 3 || payload.details.length < 10) { setError("Provide a subject of at least 3 characters and details of at least 10 characters."); return; }
    const fingerprint = JSON.stringify(payload);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, requestId: crypto.randomUUID() };
    setSaving(true); setError("");
    try { const response = await api.post("/reports", { ...payload, requestId: submission.current.requestId }); navigate(`/reports/${response.data.data._id}`, { replace: true, state: { message: response.data.message } }); }
    catch (failure) { setError(getApiErrorMessage(failure, "Unable to submit your report. Please try again.")); }
    finally { setSaving(false); }
  }
  return <ReportLayout><h1 className="text-2xl font-bold sm:text-3xl">Submit a report or complaint</h1><p className="mt-2 text-sm text-brand-charcoal">Describe what happened and the outcome you are seeking. Staff review notes stay private; you can see the case status and final resolution in My reports.</p><form onSubmit={submit} className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><fieldset disabled={saving} className="space-y-5"><legend className="sr-only">Report details</legend>{!preset && <label className="block text-sm font-medium">Report about<select value={type} onChange={(event) => { resetContext(); setType(event.target.value); setTargetId(""); }} className={`mt-2 ${reportInput}`}><option value="general">General complaint</option><option value="consultation">One of my pending consultations</option></select><span className="mt-2 block text-xs text-gray-500">To report an account or message, use its Report link in the lounge.</span></label>}{type === "consultation" && !preset && <label className="block text-sm font-medium">Consultation<select required value={targetId} onChange={(event) => { resetContext(); setTargetId(event.target.value); }} className={`mt-2 ${reportInput}`}><option value="">Select a consultation</option>{consultations.map((item) => <option key={item._id} value={item._id}>{item.eventType || "Consultation"} · {reportDate(item.eventDate)} · {item.status}</option>)}</select>{!consultations.length && !contextError && <span className="mt-2 block text-xs text-gray-500">No pending consultations loaded.</span>}</label>}{type !== "general" && targetId && !context && !contextError && <p role="status" className="text-sm">Loading reported item…</p>}{contextError && <p role="alert" className="text-sm text-red-700">{contextError}<button type="button" onClick={() => { resetContext(); setReload((value) => value + 1); }} className={`ml-3 rounded underline ${reportFocus}`}>Retry</button></p>}{context && <div><p className="text-sm font-semibold">Report about {context.targetLabel}</p><ReportEvidence evidence={context.evidence} /></div>}<label className="block text-sm font-medium">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className={`mt-2 ${reportInput}`}>{Object.entries(reportCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-medium">Subject<input required minLength={3} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className={`mt-2 ${reportInput}`} /></label><label className="block text-sm font-medium">What happened?<textarea required minLength={10} maxLength={5000} rows={7} value={details} onChange={(event) => setDetails(event.target.value)} className={`mt-2 resize-y ${reportInput}`} /><span className="mt-2 block text-xs text-gray-500">Include dates and useful context. Avoid passwords, payment card details, or unrelated private messages.</span></label><button disabled={saving || (type !== "general" && !context)} className={`rounded-lg bg-brand-navy px-5 py-2.5 text-sm text-white disabled:opacity-50 ${reportFocus}`}>{saving ? "Submitting…" : "Submit report"}</button></fieldset>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</form></ReportLayout>;
}
