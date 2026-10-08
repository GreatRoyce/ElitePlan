import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

// Availability checks are public and must never run the session logout interceptor.
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL, timeout: 5000 });
export default function usePlatformAvailability() {
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const request = useRef(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const result = await publicApi.get("/platform/availability", { signal: controller.signal });
      const value = result.data.data;
      if (!["client", "vendor", "planner"].every((role) => typeof value?.registration?.[role] === "boolean") || typeof value?.consultationsEnabled !== "boolean") throw new Error("Invalid availability response");
      if (!controller.signal.aborted) setData(value);
    } catch { if (!controller.signal.aborted) { setData(null); setError("Unable to check service availability. Please retry."); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    refresh();
    const visibleRefresh = () => { if (document.visibilityState === "visible") refresh(); };
    const interval = setInterval(visibleRefresh, 60000);
    window.addEventListener("focus", visibleRefresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", visibleRefresh); request.current?.abort(); };
  }, [refresh]);
  return { data: loading || error ? null : data, loading, error, refresh };
}
