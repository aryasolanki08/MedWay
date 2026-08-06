import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext();

let idCounter = 0;

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, duration) => showToast(msg, "success", duration),
    error: (msg, duration) => showToast(msg, "error", duration),
    info: (msg, duration) => showToast(msg, "info", duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] || Info;
          return (
            <div key={id} className={`toast toast-${type}`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{message}</span>
              <button className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
