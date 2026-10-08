import axios from "axios";
import api from "./axios";
export const publicAdvertsApi = axios.create({ baseURL: import.meta.env.VITE_API_URL, timeout: 5000 });
export const advertFeed = (member) => ({ client: member ? api : publicAdvertsApi, path: member ? "/adverts/mine" : "/adverts/public" });
export const advertPlacements = { home: "Home page", dashboard: "Member dashboard overview" };
export const ROTATION_SECONDS = 15;
export const advertKey = (a) => `${a._id}:${a.publicationVersion}`;
export function advertUrl(value, image = false) {
  // eslint-disable-next-line no-control-regex -- Reject control characters in advert URLs.
  if (typeof value !== "string" || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return image && !/^\/uploads\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|gif|webp)$/i.test(value) ? null : value;
  try { const parsed = new URL(value); return parsed.protocol === "https:" && parsed.hostname && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}
export function advertImageUrl(value) {
  const url = advertUrl(value, true);
  if (!url || !url.startsWith("/")) return url;
  try { return new URL(url, import.meta.env.VITE_API_URL).href; } catch { return null; }
}
export const liveAdverts = (adverts, now = Date.now()) => adverts.filter((a) => a.publicationVersion >= 1 && advertUrl(a.destinationUrl) && (!a.startsAt || new Date(a.startsAt).getTime() <= now) && (!a.endsAt || new Date(a.endsAt).getTime() > now));
export function nextAdvert(adverts, key, direction = 1) {
  if (!adverts.length) return null;
  const index = adverts.findIndex((a) => advertKey(a) === key);
  return adverts[index < 0 ? 0 : (index + direction + adverts.length) % adverts.length];
}
