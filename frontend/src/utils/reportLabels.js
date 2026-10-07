export const reportStatuses = { open: "Open", under_review: "Under review", resolved: "Resolved", dismissed: "Dismissed" };
export const reportCategories = { harassment: "Harassment", spam: "Spam", fraud: "Fraud or scam", service: "Service concern", staff_conduct: "Staff conduct", other: "Other" };
export const reportTypes = { general: "General complaint", account: "Account", message: "Message", consultation: "Consultation" };
export const reportDate = (value) => value ? new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : "—";
export const reportFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
export const reportInput = `w-full rounded-lg border border-brand-navy/20 bg-white px-3 py-2.5 text-sm ${reportFocus}`;
