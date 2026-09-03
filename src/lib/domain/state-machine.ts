import type {
  Box,
  BoxStatus,
  Invoice,
  InvoiceStatus,
  Shipment,
  ShipmentStatus,
  TransitionEvent,
  Truck,
  TruckStatus,
} from "@/lib/types";

export type TransitionContext = {
  actor: string;
  note?: string;
  at?: string;
};

export type TransitionResult<T> =
  | { ok: true; value: T; event: TransitionEvent }
  | { ok: false; error: string };

export const BOX_TRANSITIONS: Record<BoxStatus, readonly BoxStatus[]> = {
  "pre-alertada": ["recibida", "rechazada"],
  recibida: ["categorizada", "excede-categoria", "rechazada"],
  categorizada: ["en-bodega", "excede-categoria", "rechazada"],
  "en-bodega": ["cargada-en-camion", "excede-categoria", "rechazada"],
  "cargada-en-camion": ["en-transito"],
  "en-transito": ["en-destino"],
  "en-destino": ["entregada"],
  entregada: [],
  "excede-categoria": ["categorizada", "rechazada"],
  rechazada: [],
};

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  pendiente: ["confirmado"],
  confirmado: ["en-transito"],
  "en-transito": ["en-destino"],
  "en-destino": ["entregado"],
  entregado: [],
};

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  borrador: ["emitida"],
  emitida: ["pago-reportado", "vencida"],
  "pago-reportado": ["pagada"],
  pagada: [],
  vencida: ["pago-reportado"],
};

export const TRUCK_ACTIONS: Record<TruckStatus, { to: TruckStatus; label: string; description: string } | null> = {
  planificado: { to: "cargando", label: "Iniciar carga", description: "Las cajas asignadas pasarán a cargadas en camión." },
  cargando: { to: "despachado", label: "Despachar camión", description: "Las cajas y sus envíos pasarán a tránsito." },
  despachado: { to: "en-frontera", label: "Registrar cruce de frontera", description: "Se registrará el arribo de la unidad al cruce fronterizo." },
  "en-frontera": { to: "en-destino", label: "Marcar llegada a destino", description: "Las cajas y sus envíos pasarán a destino." },
  "en-destino": { to: "cerrado", label: "Cerrar camión", description: "La guía máster se cerrará; las entregas seguirán registrándose caja por caja." },
  cerrado: null,
};

function event(from: string | null, to: string, context: TransitionContext): TransitionEvent {
  return {
    from,
    to,
    actor: context.actor,
    at: context.at ?? new Date().toISOString(),
    note: context.note,
  };
}

function missingReason(to: string, context: TransitionContext) {
  return ["rechazada", "excede-categoria"].includes(to) && !context.note?.trim();
}

export function transitionBox(box: Box, to: BoxStatus, context: TransitionContext): TransitionResult<Box> {
  if (!BOX_TRANSITIONS[box.status].includes(to)) {
    return { ok: false, error: `La caja ${box.code} no puede pasar de ${box.status} a ${to}.` };
  }
  if (missingReason(to, context)) return { ok: false, error: "Indica el motivo para rechazar la caja o marcarla como excedente." };
  const change = event(box.status, to, context);
  return { ok: true, value: { ...box, status: to, timeline: [...box.timeline, change] }, event: change };
}

export function transitionShipment(shipment: Shipment, to: ShipmentStatus, context: TransitionContext): TransitionResult<Shipment> {
  if (!SHIPMENT_TRANSITIONS[shipment.status].includes(to)) {
    return { ok: false, error: `El envío ${shipment.code} no puede pasar de ${shipment.status} a ${to}.` };
  }
  const change = event(shipment.status, to, context);
  return { ok: true, value: { ...shipment, status: to, timeline: [...shipment.timeline, change] }, event: change };
}

export function transitionInvoice(invoice: Invoice, to: InvoiceStatus, context: TransitionContext): TransitionResult<Invoice> {
  if (!INVOICE_TRANSITIONS[invoice.status].includes(to)) {
    return { ok: false, error: `La factura ${invoice.number} no puede pasar de ${invoice.status} a ${to}.` };
  }
  const at = context.at ?? new Date().toISOString();
  if (to === "vencida" && new Date(invoice.dueAt).getTime() >= new Date(at).getTime()) {
    return { ok: false, error: `La factura ${invoice.number} todavía no alcanza su fecha de vencimiento.` };
  }
  const change = event(invoice.status, to, { ...context, at });
  return { ok: true, value: { ...invoice, status: to, timeline: [...invoice.timeline, change] }, event: change };
}

export type TruckCascade = {
  truck: Truck;
  boxes: Box[];
  shipments: Shipment[];
  changedBoxIds: string[];
  changedShipmentIds: string[];
};

export function transitionTruckWithCascade(
  truck: Truck,
  boxes: Box[],
  shipments: Shipment[],
  context: TransitionContext,
): TransitionResult<TruckCascade> {
  const action = TRUCK_ACTIONS[truck.status];
  if (!action) return { ok: false, error: `El camión ${truck.code} ya está cerrado.` };
  if (truck.status === "cargando" && truck.boxIds.length === 0) {
    return { ok: false, error: "No puedes despachar un camión sin cajas asignadas." };
  }

  const boxTarget: Partial<Record<TruckStatus, BoxStatus>> = {
    cargando: "cargada-en-camion",
    despachado: "en-transito",
    "en-destino": "en-destino",
  };
  const shipmentTarget: Partial<Record<TruckStatus, ShipmentStatus>> = {
    despachado: "en-transito",
    "en-destino": "en-destino",
  };
  const nextBoxes = [...boxes];
  const nextShipments = [...shipments];
  const changedBoxIds: string[] = [];
  const changedShipmentIds: string[] = [];
  const targetBoxStatus = boxTarget[action.to];
  const targetShipmentStatus = shipmentTarget[action.to];

  if (targetBoxStatus) {
    for (const boxId of truck.boxIds) {
      const index = nextBoxes.findIndex((box) => box.id === boxId);
      if (index < 0) return { ok: false, error: `No encontramos la caja ${boxId} asignada a ${truck.code}.` };
      const result = transitionBox(nextBoxes[index]!, targetBoxStatus, context);
      if (!result.ok) return result;
      nextBoxes[index] = result.value;
      changedBoxIds.push(boxId);
    }
  }

  if (targetShipmentStatus) {
    for (const shipment of nextShipments.filter((item) => item.truckId === truck.id)) {
      const index = nextShipments.findIndex((item) => item.id === shipment.id);
      const result = transitionShipment(shipment, targetShipmentStatus, context);
      if (!result.ok) return result;
      nextShipments[index] = result.value;
      changedShipmentIds.push(shipment.id);
    }
  }

  const change = event(truck.status, action.to, context);
  return {
    ok: true,
    value: {
      truck: { ...truck, status: action.to, timeline: [...truck.timeline, change] },
      boxes: nextBoxes,
      shipments: nextShipments,
      changedBoxIds,
      changedShipmentIds,
    },
    event: change,
  };
}

export function deliverBoxWithCascade(
  boxId: string,
  boxes: Box[],
  shipments: Shipment[],
  context: TransitionContext,
): TransitionResult<{ boxes: Box[]; shipments: Shipment[]; completedShipmentIds: string[] }> {
  const boxIndex = boxes.findIndex((box) => box.id === boxId);
  if (boxIndex < 0) return { ok: false, error: "No encontramos la caja que quieres entregar." };
  const delivered = transitionBox(boxes[boxIndex]!, "entregada", context);
  if (!delivered.ok) return delivered;
  const nextBoxes = [...boxes];
  nextBoxes[boxIndex] = delivered.value;
  const nextShipments = [...shipments];
  const completedShipmentIds: string[] = [];

  for (const shipment of shipments.filter((item) => item.boxIds.includes(boxId))) {
    const allDelivered = shipment.boxIds.every((id) => nextBoxes.find((candidate) => candidate.id === id)?.status === "entregada");
    if (!allDelivered || shipment.status === "entregado") continue;
    const result = transitionShipment(shipment, "entregado", context);
    if (!result.ok) return result;
    nextShipments[nextShipments.findIndex((item) => item.id === shipment.id)] = result.value;
    completedShipmentIds.push(shipment.id);
  }

  return { ok: true, value: { boxes: nextBoxes, shipments: nextShipments, completedShipmentIds }, event: delivered.event };
}
