import { reportDate } from "../../utils/reportLabels";

export default function ReportEvidence({ evidence }) {
  if (!evidence || (!evidence.text && !evidence.eventType)) return null;
  return <section className="mt-5 rounded-xl bg-brand-ivory p-4"><h2 className="text-sm font-semibold">Reported item at submission</h2>{evidence.text && <><p className="mt-2 whitespace-pre-wrap break-words text-sm">{evidence.text}</p><p className="mt-2 text-xs text-gray-500">Sent {reportDate(evidence.sentAt)} (Lagos time)</p></>}{evidence.eventType && <p className="mt-2 text-sm">{evidence.eventType} · {reportDate(evidence.eventDate)} · {evidence.consultationStatus}</p>}</section>;
}
