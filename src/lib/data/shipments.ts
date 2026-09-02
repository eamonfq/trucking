import { SHIPMENT_STATUSES, type Shipment } from "@/lib/types";

export const shipments: Shipment[] = Array.from({ length: 8 }, (_, index) => {
  const status = SHIPMENT_STATUSES[index % SHIPMENT_STATUSES.length]!;
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `ship-${number}`,
    code: `SH-26${String(index + 1).padStart(4, "0")}`,
    userId: `usr-00${(index % 3) + 1}`,
    recipientId: `rec-00${(index % 3) + 1}`,
    boxIds: [`box-${String(index + 9).padStart(3, "0")}`, `box-${String(index + 17).padStart(3, "0")}`],
    truckId: index > 1 ? `truck-00${(index % 3) + 1}` : undefined,
    status,
    destinationCity: ["Ciudad de México", "Monterrey", "Guadalajara"][index % 3]!,
    timeline: [
      { status: "pendiente", occurredAt: new Date(Date.UTC(2026, 7, 4 + index)).toISOString(), location: "Miami, FL", description: "Envío creado para demostración." },
      ...(status === "pendiente" ? [] : [{ status, occurredAt: new Date(Date.UTC(2026, 7, 8 + index)).toISOString(), location: "Ruta USA–México", description: "Avance operativo simulado." }]),
    ],
  } satisfies Shipment;
});
