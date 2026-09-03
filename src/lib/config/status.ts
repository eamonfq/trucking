import type { BoxStatus, InvoiceStatus, ShipmentStatus, TruckStatus } from "@/lib/types";

export type OperationalStatus = BoxStatus | ShipmentStatus | TruckStatus | InvoiceStatus;
export type StatusTone = "neutral" | "info" | "attention" | "success" | "danger";

export const STATUS_CONFIG: Record<OperationalStatus, { label: string; tone: StatusTone; className: string }> = {
  "pre-alertada": { label: "Pre-alertada", tone: "info", className: "bg-[#f4efff] text-[#6941c6]" },
  recibida: { label: "Recibida", tone: "info", className: "bg-[#eff8ff] text-[#175cd3]" },
  categorizada: { label: "Categorizada", tone: "info", className: "bg-[#eef4ff] text-[#3538cd]" },
  "en-bodega": { label: "En bodega", tone: "attention", className: "bg-orange-50 text-orange-600" },
  "cargada-en-camion": { label: "Cargada en camión", tone: "attention", className: "bg-[#fff8e8] text-[#8a4d00]" },
  "en-transito": { label: "En tránsito", tone: "info", className: "bg-[#e8f7ff] text-[#086a98]" },
  "en-destino": { label: "En destino", tone: "success", className: "bg-success-50 text-success-700" },
  entregada: { label: "Entregada", tone: "success", className: "bg-success-50 text-success-700" },
  "excede-categoria": { label: "Excede categoría", tone: "danger", className: "bg-danger-50 text-danger-700" },
  rechazada: { label: "Rechazada", tone: "danger", className: "bg-danger-50 text-danger-700" },
  pendiente: { label: "Pendiente", tone: "neutral", className: "bg-stone-100 text-stone-500" },
  confirmado: { label: "Confirmado", tone: "info", className: "bg-[#eef4ff] text-[#3538cd]" },
  entregado: { label: "Entregado", tone: "success", className: "bg-success-50 text-success-700" },
  planificado: { label: "Planificado", tone: "neutral", className: "bg-stone-100 text-stone-500" },
  cargando: { label: "Cargando", tone: "attention", className: "bg-orange-50 text-orange-600" },
  despachado: { label: "Despachado", tone: "info", className: "bg-[#e8f7ff] text-[#086a98]" },
  "en-frontera": { label: "En frontera", tone: "attention", className: "bg-[#fff8e8] text-[#8a4d00]" },
  cerrado: { label: "Cerrado", tone: "success", className: "bg-success-50 text-success-700" },
  borrador: { label: "Borrador", tone: "neutral", className: "bg-stone-100 text-stone-500" },
  emitida: { label: "Emitida", tone: "info", className: "bg-[#eff8ff] text-[#175cd3]" },
  "pago-reportado": { label: "Pago reportado", tone: "attention", className: "bg-[#fff8e8] text-[#8a4d00]" },
  pagada: { label: "Pagada", tone: "success", className: "bg-success-50 text-success-700" },
  vencida: { label: "Vencida", tone: "danger", className: "bg-danger-50 text-danger-700" },
};

export function getStatusLabel(status: string) {
  return STATUS_CONFIG[status as OperationalStatus]?.label ?? status.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function getStatusClassName(status: string) {
  return STATUS_CONFIG[status as OperationalStatus]?.className ?? "bg-navy-100 text-navy-700";
}
