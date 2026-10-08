import axios from "axios";
import api from "./axios";
export const publicAnnouncementsApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });
export const isAnnouncementMember = (user) => ["client", "vendor", "planner"].includes(user?.role);
export const announcementFeed = (member) => ({ client: member ? api : publicAnnouncementsApi, path: member ? "/announcements/mine" : "/announcements/public" });
export const audienceLabels = { public: "Everyone (including visitors)", client: "Clients", vendor: "Vendors", planner: "Planners" };
export const announcementStates = { draft: "Draft", scheduled: "Scheduled", live: "Live", expired: "Expired", withdrawn: "Withdrawn", archived: "Archived" };
export const announcementFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2";
export const announcementInput = `mt-2 w-full rounded-lg border border-brand-navy/20 bg-white p-3 text-sm ${announcementFocus}`;
export const announcementButton = `rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 ${announcementFocus}`;
export const publicationKey = (a) => `${a._id}:${a.publicationVersion}`;
export function guestDismissals() { try { const saved = JSON.parse(sessionStorage.getItem("eliteplan-announcement-dismissals") || "[]"); return Array.isArray(saved) ? saved.filter((v) => typeof v === "string").slice(-100) : []; } catch { return []; } }
export function dismissGuest(a) { const saved = [...new Set([...guestDismissals(), publicationKey(a)])].slice(-100); try { sessionStorage.setItem("eliteplan-announcement-dismissals", JSON.stringify(saved)); } catch { /* In-memory UI still dismisses this visit. */ } return saved; }
export const lagosInput = (value) => value ? new Date(new Date(value).getTime() + 3600000).toISOString().slice(0, 16) : "";
export const fromLagosInput = (value) => { if (!value) return null; const parsed = new Date(`${value}:00+01:00`); return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined; };
export const currentAnnouncement = (a, now = Date.now()) => (!a.startsAt || new Date(a.startsAt).getTime() <= now) && (!a.endsAt || new Date(a.endsAt).getTime() > now);
