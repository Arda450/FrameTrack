import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ToastViewport } from "./ToastViewport";

export type ToastTone = "success" | "error";

export type ToastItem = {
  id: string;
  tone: ToastTone;
  message: ReactNode;
  detail?: ReactNode;
};

type ShowToastOptions = {
  detail?: ReactNode;
  durationMs?: number;
};

type ToastContextValue = {
  success: (message: ReactNode, options?: ShowToastOptions) => void;
  error: (message: ReactNode, options?: ShowToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4200;

/** Erzeugt eine eindeutige Toast Kennung. */
function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Stellt Toast Zustand und Aktionen für die gesamte App bereit. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: ReactNode, options?: ShowToastOptions) => {
      const id = createId();
      const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
      setToasts((current) => [
        ...current,
        { id, tone, message, detail: options?.detail },
      ]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message, options) => push("success", message, options),
      error: (message, options) =>
        push("error", message, {
          ...options,
          durationMs: options?.durationMs ?? 5600,
        }),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Zugriff auf Toast Erfolgs und Fehlermeldungen. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast muss innerhalb von ToastProvider verwendet werden.",
    );
  }
  return ctx;
}
