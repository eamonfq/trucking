import type { HTMLAttributes } from "react";
import { getStatusLabel } from "@/lib/config/statuses";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full bg-navy-100 px-2.5 py-1 text-xs font-bold text-navy-700", className)} {...props} />;
}

const statusStyles: Record<string, string> = {
  "pre-alertada": "bg-[#f4efff] text-[#6941c6]",
  recibida: "bg-[#eff8ff] text-[#175cd3]",
  categorizada: "bg-[#eef4ff] text-[#3538cd]",
  "en-bodega": "bg-orange-50 text-orange-600",
  "cargada-en-camion": "bg-[#fff8e8] text-[#a15c00]",
  "en-transito": "bg-[#e8f7ff] text-[#0874a8]",
  "en-destino": "bg-[#ecfdf3] text-success-700",
  entregada: "bg-success-50 text-success-700",
  entregado: "bg-success-50 text-success-700",
  confirmado: "bg-[#eef4ff] text-[#3538cd]",
  pendiente: "bg-stone-100 text-stone-500",
  "excede-categoria": "bg-danger-50 text-danger-700",
  rechazada: "bg-danger-50 text-danger-700",
  vencida: "bg-danger-50 text-danger-700",
  pagada: "bg-success-50 text-success-700",
  emitida: "bg-[#eff8ff] text-[#175cd3]",
  borrador: "bg-stone-100 text-stone-500",
  "pago-reportado": "bg-[#fff8e8] text-[#a15c00]",
  planificado: "bg-stone-100 text-stone-500",
  cargando: "bg-orange-50 text-orange-600",
  despachado: "bg-[#e8f7ff] text-[#0874a8]",
  "en-frontera": "bg-[#fff8e8] text-[#a15c00]",
  cerrado: "bg-success-50 text-success-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={statusStyles[status] ?? "bg-navy-100 text-navy-700"}>{getStatusLabel(status)}</Badge>;
}
