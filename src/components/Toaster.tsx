"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

/* ─── Types ─── */
export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  /** true while the exit animation plays */
  leaving: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

/* ─── Context ─── */
const ToastCtx = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

/* ─── Provider ─── */
let uid = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    // Mark as leaving → triggers CSS exit animation
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    // Remove after animation completes
    const t = setTimeout(
      () => setItems((prev) => prev.filter((t) => t.id !== id)),
      300,
    );
    timers.current.set(id, t);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++uid;
      setItems((prev) => [...prev, { id, message, type, leaving: false }]);
      // Auto-dismiss after 2 s
      const t = setTimeout(() => dismiss(id), 2000);
      timers.current.set(id, t);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}

      {/* Portal-like fixed container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 left-0 right-0 z-[300] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end sm:px-0"
      >
        {items.map((item) => (
          <ToastBubble
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ─── Single toast ─── */
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 shrink-0 text-red-500" />,
  info: <Info className="h-4 w-4 shrink-0 text-blue-500" />,
};

function ToastBubble({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      onClick={onDismiss}
      className={`pointer-events-auto flex w-full max-w-sm cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg ${
        item.leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      {ICONS[item.type]}
      <span className="flex-1 text-sm font-medium leading-snug">
        {item.message}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="shrink-0 rounded-lg p-0.5 text-muted transition-colors hover:text-foreground"
        aria-label="Закрыть"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
