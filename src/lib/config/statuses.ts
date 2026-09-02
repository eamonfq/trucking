export const STATUS_LABELS: Record<string, string> = {
  "pre-alertada": "Pre-alertada",
  recibida: "Recibida",
  categorizada: "Categorizada",
  "en-bodega": "En bodega",
  "cargada-en-camion": "Cargada en camión",
  "en-transito": "En tránsito",
  "en-destino": "En destino",
  entregada: "Entregada",
  "excede-categoria": "Excede categoría",
  rechazada: "Rechazada",
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  planificado: "Planificado",
  cargando: "Cargando",
  despachado: "Despachado",
  "en-frontera": "En frontera",
  cerrado: "Cerrado",
  borrador: "Borrador",
  emitida: "Emitida",
  "pago-reportado": "Pago reportado",
  pagada: "Pagada",
  vencida: "Vencida",
};

export const getStatusLabel = (status: string) =>
  STATUS_LABELS[status.toLowerCase()] ?? status.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
