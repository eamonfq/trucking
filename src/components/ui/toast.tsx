"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastItem = { id: string; title: string; description?: string; variant?: "success" | "error" };
type ToastContextValue = { showToast: (toast: Omit<ToastItem, "id">) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const showToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return (
    <ToastContext.Provider value={value}>{children}<div className="fixed bottom-5 right-5 z-[60] grid w-[min(24rem,calc(100vw-2.5rem))] gap-3" aria-live="polite">{items.map((item) => <div key={item.id} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-lift">{item.variant === "error" ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger-700" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-700" aria-hidden="true" />}<div className="min-w-0 flex-1"><p className="text-sm font-bold text-navy-950">{item.title}</p>{item.description && <p className="mt-1 text-sm text-navy-500">{item.description}</p>}</div><button type="button" onClick={() => dismiss(item.id)} aria-label="Cerrar notificación" className="grid size-8 place-items-center rounded-full text-navy-500 hover:bg-navy-100"><X className="size-4" /></button></div>)}</div></ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider");
  return context;
}
