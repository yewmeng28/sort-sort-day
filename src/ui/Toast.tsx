import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastOptions {
  message: string;
  /** e.g. Undo. The toast closes after it runs. */
  action?: { label: string; run: () => void };
  /** Milliseconds; defaults to 6s with an action (time to undo), 3s without. */
  duration?: number;
}

type ShowToast = (toast: ToastOptions) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** One toast at a time above the tab bar; a new one replaces the old. Announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback<ShowToast>((options) => {
    window.clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
    timer.current = window.setTimeout(() => setToast(null), options.duration ?? (options.action ? 6000 : 3000));
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div key={toast.id} className="toast" role="status">
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action!.run();
                  dismiss();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
