import axios from "axios";

// Support credentials must never enter the normal dashboard session.
const supportApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });
const key = "eliteplan-support-token";
let memoryToken = null;
export function setSupportToken(token) {
  memoryToken = token;
  try { if (token) sessionStorage.setItem(key, token); else sessionStorage.removeItem(key); } catch { /* In-memory session still works. */ }
}
export function supportToken() {
  try { return sessionStorage.getItem(key) || memoryToken || localStorage.getItem("token"); } catch { return memoryToken; }
}
supportApi.interceptors.request.use((config) => {
  if (config.url !== "/support/session") {
    const token = supportToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export const supportLabels = { support: "Support request", appeal: "Appeal", account: "Account restriction", listing: "Hidden listing", verification: "Verification decision", account_access: "Account access", profile: "Professional profile", technical: "Technical issue", billing: "Billing question", other: "Other", open: "Open", under_review: "Under review", waiting_member: "Awaiting your reply", resolved: "Resolved", rejected: "Rejected" };
export const supportStatuses = ["open", "under_review", "waiting_member", "resolved", "rejected"];
export const supportFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
export const supportInput = `mt-2 w-full rounded-lg border border-brand-navy/20 bg-white p-3 text-sm ${supportFocus}`;
export const supportButton = `rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 ${supportFocus}`;
export const isClosed = (ticket) => ["resolved", "rejected"].includes(ticket.status);
export default supportApi;
