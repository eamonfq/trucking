import type { BoxStatus, InvoiceStatus, ShipmentStatus, SupportStatus, TruckStatus } from "@/lib/types";

export type OperationalStatus = BoxStatus | ShipmentStatus | TruckStatus | InvoiceStatus | SupportStatus;
export type StatusTone = "neutral" | "info" | "attention" | "success" | "danger";

/*
  Un color por estado, tomado del kit del rediseño. Los estados en movimiento y
  los terminales van en sólido; el resto usa tinte con borde del mismo tono.
*/
const NEUTRAL = "bg-[#EEF0F5] text-[#4A536B] border-[#DDE1EA]";
const INFO = "bg-[#E3E9F6] text-navy-900 border-[#C9D5EC]";
const PURPLE = "bg-[#EDE9FB] text-[#5A4A9C] border-[#D9D2F5]";
const TEAL = "bg-[#DFF3F6] text-[#0E6B7A] border-[#BFE6EC]";
const AMBER = "bg-[#FCEFD6] text-warning border-[#F2DCAE]";
const CREAM = "bg-cream-100 text-navy-900 border-[#E4DACA]";
const DANGER = "bg-[#FDECEA] text-danger border-[#F5CFCB]";
const MOVING = "bg-brand-700 text-white border-brand-700";
const DONE = "bg-success text-white border-success";

export const STATUS_CONFIG: Record<OperationalStatus, { label: string; tone: StatusTone; className: string }> = {
  "pre-alertada": { label: "Pre-alertada", tone: "neutral", className: NEUTRAL },
  recibida: { label: "Recibida", tone: "info", className: INFO },
  categorizada: { label: "Categorizada", tone: "info", className: INFO },
  "en-bodega": { label: "En bodega", tone: "attention", className: PURPLE },
  "cargada-en-camion": { label: "Cargada en camión", tone: "attention", className: TEAL },
  "en-transito": { label: "En tránsito", tone: "info", className: MOVING },
  "en-destino": { label: "En destino", tone: "success", className: CREAM },
  entregada: { label: "Entregada", tone: "success", className: DONE },
  "excede-categoria": { label: "Excede categoría", tone: "danger", className: DANGER },
  rechazada: { label: "Rechazada", tone: "danger", className: DANGER },
  pendiente: { label: "Pendiente", tone: "neutral", className: NEUTRAL },
  confirmado: { label: "Confirmado", tone: "info", className: INFO },
  entregado: { label: "Entregado", tone: "success", className: DONE },
  planificado: { label: "Planificado", tone: "neutral", className: NEUTRAL },
  cargando: { label: "Cargando", tone: "attention", className: PURPLE },
  despachado: { label: "Despachado", tone: "info", className: TEAL },
  "en-frontera": { label: "En frontera", tone: "attention", className: AMBER },
  cerrado: { label: "Cerrado", tone: "success", className: CREAM },
  borrador: { label: "Borrador", tone: "neutral", className: NEUTRAL },
  emitida: { label: "Emitida", tone: "info", className: INFO },
  "pago-reportado": { label: "Pago reportado", tone: "attention", className: AMBER },
  pagada: { label: "Pagada", tone: "success", className: DONE },
  vencida: { label: "Vencida", tone: "danger", className: DANGER },
  abierto: { label: "Abierto", tone: "attention", className: AMBER },
  "en-revision": { label: "En revisión", tone: "info", className: INFO },
};

export function getStatusLabel(status: string) {
  return STATUS_CONFIG[status as OperationalStatus]?.label ?? status.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function getStatusClassName(status: string) {
  return STATUS_CONFIG[status as OperationalStatus]?.className ?? NEUTRAL;
}
