import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type Tone = 'success' | 'error';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  success(message: string, action?: Toast['action']): void;
  error(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (tone: Tone, message: string, action?: Toast['action']) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, tone, message, action }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m, a) => push('success', m, a), error: (m) => push('error', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-toast items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-ink shadow-lg"
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" aria-hidden />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-negative" aria-hidden />
            )}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                className="font-medium text-accent hover:underline"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="text-ink-faint hover:text-ink" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
