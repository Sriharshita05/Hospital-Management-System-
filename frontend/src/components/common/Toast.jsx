import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message)
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="ui-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast-${t.type}`}>
            {t.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{t.message}</span>
            <button className="ui-toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
