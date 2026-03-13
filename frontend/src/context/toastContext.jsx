import React, { useCallback, useMemo, useState } from "react";
import ToastContext from "./toastStore";

const TOAST_TIMEOUT_MS = 4000;

function ToastHost({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 w-full max-w-sm px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
            t.type === "success"
              ? "bg-green-50/95 border-green-200 text-green-900"
              : t.type === "error"
              ? "bg-red-50/95 border-red-200 text-red-900"
              : "bg-slate-50/95 border-slate-200 text-slate-900"
          }`}
          role="status"
        >
          <div className="flex-1 text-sm leading-relaxed">{t.message}</div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, timeout = TOAST_TIMEOUT_MS) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (timeout > 0) {
      setTimeout(() => removeToast(id), timeout);
    }
  }, [removeToast]);

  const api = useMemo(
    () => ({
      success: (message, timeout) => addToast("success", message, timeout),
      error: (message, timeout) => addToast("error", message, timeout),
      info: (message, timeout) => addToast("info", message, timeout),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}
