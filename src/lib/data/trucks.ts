import type { Truck } from "@/lib/types";

export const trucks: Truck[] = [
  { id: "truck-001", code: "TR-260101", plate: "DEMO-01", driverName: "Chofer demo 1", departureDate: "2026-09-04", route: "Miami → Ciudad de México", status: "planificado", boxIds: ["box-009", "box-017"], timeline: [] },
  { id: "truck-002", code: "TR-260102", plate: "DEMO-02", driverName: "Chofer demo 2", departureDate: "2026-08-29", route: "Miami → Monterrey", status: "en-frontera", boxIds: ["box-010", "box-018"], timeline: [{ status: "despachado", occurredAt: "2026-08-29T14:00:00.000Z", location: "Miami, FL", description: "Salida simulada." }] },
  { id: "truck-003", code: "TR-260103", plate: "DEMO-03", driverName: "Chofer demo 3", departureDate: "2026-08-22", route: "Miami → Guadalajara", status: "cerrado", boxIds: ["box-011", "box-019"], timeline: [{ status: "cerrado", occurredAt: "2026-08-30T17:30:00.000Z", location: "Guadalajara", description: "Ruta simulada finalizada." }] },
];
