import type { Truck } from "@/lib/types";

export const trucks: Truck[] = [
  { id: "truck-001", code: "TR-260101", plate: "DEMO-01", driverName: "Chofer demo 1", departureDate: "2026-09-04", route: "Miami → Ciudad de México", status: "planificado", boxIds: ["box-004", "box-014"], timeline: [{ from: null, to: "planificado", actor: "Operaciones A&L", at: "2026-09-01T14:00:00.000Z", note: "Salida creada y lista para iniciar carga." }] },
  { id: "truck-002", code: "TR-260102", plate: "DEMO-02", driverName: "Chofer demo 2", departureDate: "2026-08-29", route: "Miami → Monterrey", status: "en-frontera", boxIds: ["box-006", "box-016"], timeline: [{ from: "cargando", to: "despachado", actor: "Operaciones A&L", at: "2026-08-29T14:00:00.000Z", note: "Salida registrada desde Miami." }, { from: "despachado", to: "en-frontera", actor: "Operaciones A&L", at: "2026-09-01T11:20:00.000Z", note: "Unidad presentada en cruce fronterizo." }] },
  { id: "truck-003", code: "TR-260103", plate: "DEMO-03", driverName: "Chofer demo 3", departureDate: "2026-08-22", route: "Miami → Guadalajara", status: "cerrado", boxIds: ["box-008", "box-018"], timeline: [{ from: "en-destino", to: "cerrado", actor: "Operaciones A&L", at: "2026-08-30T17:30:00.000Z", note: "Ruta finalizada en centro de destino." }] },
];
