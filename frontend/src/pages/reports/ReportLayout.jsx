import { Link } from "react-router-dom";
import AdminLayout from "../admin/AdminLayout";
import { reportFocus } from "../../utils/reportLabels";

export default function ReportLayout({ staff, loading, children }) {
  if (staff) return <AdminLayout loading={loading}>{children}</AdminLayout>;
  return <div className="min-h-screen bg-brand-ivory p-5 text-brand-navy sm:p-8"><main className="mx-auto max-w-5xl" aria-busy={loading}><nav aria-label="Reports navigation" className="mb-8 flex flex-wrap gap-5 text-sm"><Link to="/lounge" className={`rounded ${reportFocus}`}>Back to lounge</Link><Link to="/reports" className={`rounded ${reportFocus}`}>My reports</Link></nav>{children}</main></div>;
}
