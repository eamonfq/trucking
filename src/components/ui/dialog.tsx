"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Dialog({ open, onClose, title, description, children, size = "default" }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; size?: "default" | "large" }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; previousFocus?.focus(); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description ? "dialog-description" : undefined} className={cn("w-full rounded-card bg-white p-6 shadow-lift outline-none", size === "large" ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-start justify-between gap-4"><div><h2 id="dialog-title" className="font-display text-xl font-bold text-navy-950">{title}</h2>{description && <p id="dialog-description" className="mt-2 text-sm leading-6 text-navy-500">{description}</p>}</div><button type="button" onClick={onClose} aria-label="Cerrar diálogo" className="grid size-10 shrink-0 place-items-center rounded-full text-navy-500 transition hover:bg-navy-100"><X className="size-5" /></button></div>
        <div className="mt-6">{children}</div>
      </div>
    </div>, document.body
  );
}
