import { useState } from "react";
import { dateLabel } from "../../utils/analyticsDates";

const metrics = { pageViews: "Page views", visitors: "Unique browsers", visits: "Visits" };
const number = (value) => new Intl.NumberFormat().format(value);

export default function VisitTrend({ daily }) {
  const [metric, setMetric] = useState("pageViews");
  const max = Math.max(1, ...daily.map((row) => row[metric]));
  const width = 800;
  const height = 200;
  const step = width / daily.length;

  return (
    <section className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-lg font-semibold">Daily traffic</h2><p className="mt-1 text-xs text-gray-500">Dates shown in Lagos time.</p></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Traffic metric">
          {Object.entries(metrics).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)} className={`rounded-lg px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${metric === key ? "bg-brand-navy text-white" : "bg-brand-ivory text-brand-charcoal hover:bg-gray-100"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-2 text-xs text-gray-500">Peak: {number(Math.max(...daily.map((row) => row[metric])))} {metrics[metric].toLowerCase()}</p>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full sm:h-52" preserveAspectRatio="none" role="img" aria-label={`${metrics[metric]} by day. Exact values are available in the daily figures table below.`}>
          {[0, 0.5, 1].map((line) => <line key={line} x1="0" x2={width} y1={line * (height - 4)} y2={line * (height - 4)} stroke="#e5e7eb" strokeWidth="1" />)}
          {daily.map((row, index) => {
            const barHeight = row[metric] / max * (height - 8);
            return <rect key={row.date} x={index * step + step * 0.15} y={height - 4 - barHeight} width={step * 0.7} height={barHeight} rx="2" fill="#D4AF37"><title>{dateLabel(row.date)}: {number(row[metric])} {metrics[metric].toLowerCase()}</title></rect>;
          })}
        </svg>
        <div className="mt-2 flex justify-between gap-3 text-xs text-gray-500"><span>{dateLabel(daily[0].date)}</span><span>{dateLabel(daily[daily.length - 1].date)}</span></div>
      </div>
      <details className="mt-5 border-t border-gray-100 pt-4">
        <summary className="w-fit cursor-pointer rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">View daily figures</summary>
        <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-gray-100" tabIndex={0} role="region" aria-label="Daily traffic figures">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="sr-only">Daily page views, unique browsers, and visits in Lagos time</caption>
            <thead className="sticky top-0 bg-brand-ivory"><tr>{["Date", "Page views", "Unique browsers", "Visits"].map((label) => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{daily.map((row) => <tr key={row.date}><th scope="row" className="whitespace-nowrap px-4 py-3 font-normal">{dateLabel(row.date)}</th><td className="px-4 py-3">{number(row.pageViews)}</td><td className="px-4 py-3">{number(row.visitors)}</td><td className="px-4 py-3">{number(row.visits)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
