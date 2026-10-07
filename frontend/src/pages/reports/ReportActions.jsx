import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../utils/axios";
import { hasStaffPermission } from "../../utils/staffAccess";
import { reportFocus, reportInput } from "../../utils/reportLabels";

const labels = { claim: "Claim case", assign: "Assign reviewer", release: "Release case", note: "Add private note", priority: "Change urgency", resolve: "Resolve case", dismiss: "Dismiss case", reopen: "Reopen case" };

export default function ReportActions({ report, user, onChanged }) {
  const admin = user.role === "admin";
  const closed = ["resolved", "dismissed"].includes(report.status);
  const involved = [report.reporter, report.targetUser].includes(user.id);
  const canManage = hasStaffPermission(user, "reports.manage") && !involved;
  const own = report.assignedTo === user.id;
  const actions = !canManage ? [] : closed ? admin || own ? ["reopen"] : [] : [
    ...(!report.assignedTo ? ["claim"] : []), ...(admin ? ["assign"] : []),
    ...(report.assignedTo && (admin || own) ? ["note", "priority", "resolve", "dismiss", "release"] : []),
  ];
  const [action, setAction] = useState(actions[0] || "");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [priority, setPriority] = useState(report.priority);
  const [reviewer, setReviewer] = useState("");
  const [reviewers, setReviewers] = useState([]);
  const [reviewerError, setReviewerError] = useState("");
  const [retry, setRetry] = useState(0);
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!admin || action !== "assign") return;
    let active = true;
    api.get("/admin/reports/reviewers").then((response) => { if (active) setReviewers(response.data.data); }).catch((failure) => { if (active) setReviewerError(getApiErrorMessage(failure, "Unable to load reviewers.")); });
    return () => { active = false; };
  }, [admin, action, retry]);
  async function submit() {
    setSaving(true); setError("");
    try {
      const response = await api.post(`/admin/reports/${report._id}/actions`, { action, expectedVersion: report.version, note: note.trim(), ...(["resolve", "dismiss"].includes(action) ? { resolution: resolution.trim() } : {}), ...(action === "assign" ? { assignedTo: reviewer } : {}), ...(action === "priority" ? { priority } : {}) });
      await onChanged(response.data.message);
    } catch (failure) {
      if (failure.response?.status === 409) await onChanged(getApiErrorMessage(failure));
      else { setReview(false); setError(getApiErrorMessage(failure, "Unable to update this case.")); }
    } finally { setSaving(false); }
  }
  return <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Review actions</h2>{!actions.length ? <p className="mt-3 text-sm text-gray-500">{involved ? "Another reviewer must handle a case involving your account." : !canManage ? "Your access allows viewing reports only." : "This case is assigned to another reviewer."}</p> : <form className="mt-4" onSubmit={(event) => { event.preventDefault(); setError(""); if (note.trim() && (!["resolve", "dismiss"].includes(action) || resolution.trim())) setReview(true); }}><fieldset disabled={saving || review} className="space-y-4"><legend className="sr-only">Update report</legend><label className="block text-sm font-medium">Action<select value={action} onChange={(event) => { setAction(event.target.value); setError(""); }} className={`mt-2 ${reportInput}`}>{actions.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>{action === "assign" && <><label className="block text-sm font-medium">Reviewer<select required value={reviewer} onChange={(event) => setReviewer(event.target.value)} className={`mt-2 ${reportInput}`}><option value="">Select a reviewer</option>{reviewers.filter((candidate) => ![report.reporter, report.targetUser].includes(candidate._id) && (!report.adminOnly || candidate.role === "admin")).map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.username} ({candidate.role})</option>)}</select></label>{reviewerError && <p role="alert" className="text-sm text-red-700">{reviewerError}<button type="button" onClick={() => { setReviewerError(""); setRetry((value) => value + 1); }} className={`ml-2 rounded underline ${reportFocus}`}>Retry</button></p>}</>}{action === "priority" && <label className="block text-sm font-medium">Urgency<select value={priority} onChange={(event) => setPriority(event.target.value)} className={`mt-2 ${reportInput}`}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label>}<label className="block text-sm font-medium">Private review note<textarea required maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className={`mt-2 resize-y ${reportInput}`} /><span className="mt-2 block text-xs text-gray-500">Visible to authorized staff only.</span></label>{["resolve", "dismiss"].includes(action) && <label className="block text-sm font-medium">Resolution for the reporter<textarea required maxLength={2000} rows={4} value={resolution} onChange={(event) => setResolution(event.target.value)} className={`mt-2 resize-y ${reportInput}`} /><span className="mt-2 block text-xs text-gray-500">The person who submitted the report will see this message.</span></label>}<button disabled={!note.trim()} className={`rounded-lg bg-brand-navy px-4 py-2.5 text-sm text-white disabled:opacity-50 ${reportFocus}`}>Review change</button></fieldset>{review && <div className="mt-4 rounded-xl bg-brand-ivory p-4" role="group" aria-label="Confirm case change"><p className="text-sm font-semibold">{labels[action]}?</p>{action === "assign" && <p className="mt-2 text-sm">Reviewer: {reviewers.find((candidate) => candidate._id === reviewer)?.username}</p>}{action === "priority" && <p className="mt-2 text-sm">Urgency: {priority}</p>}<p className="mt-2 whitespace-pre-wrap break-words text-sm">Private note: {note.trim()}</p>{["resolve", "dismiss"].includes(action) && <p className="mt-2 whitespace-pre-wrap break-words text-sm">Reporter resolution: {resolution.trim()}</p>}<div className="mt-4 flex gap-3"><button type="button" disabled={saving} onClick={submit} className={`rounded-lg bg-brand-royal px-4 py-2 text-sm text-white disabled:opacity-50 ${reportFocus}`}>{saving ? "Saving…" : "Confirm change"}</button><button type="button" disabled={saving} onClick={() => setReview(false)} className={`rounded px-3 py-2 text-sm ${reportFocus}`}>Cancel</button></div></div>}</form>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</section>;
}
