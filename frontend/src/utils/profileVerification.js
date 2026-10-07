import api from "./axios";

export const verificationLabels = { unverified: "Awaiting verification", verified: "Verified", rejected: "Verification rejected", revoked: "Verification revoked" };
export const verificationFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
export const verificationInput = `w-full rounded-lg border border-brand-navy/20 bg-white px-3 py-2.5 text-sm ${verificationFocus}`;
export const verificationDate = (value) => value ? new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : "Not recorded";
export function profileLink(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^https?:\/\//i.test(value)) { try { const url = new URL(value); return url.username || url.password ? null : url.href; } catch { return null; } }
  if (/^uploads\/[a-z0-9/_ .-]+$/i.test(value) && !value.split("/").includes("..")) return `${(api.defaults.baseURL || "").replace(/\/api\/v\d+\/?$/, "")}/${value}`;
  return null;
}
