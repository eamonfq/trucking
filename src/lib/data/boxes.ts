import { BOX_CATEGORIES } from "@/lib/config/box-categories";
import { BOX_STATUSES, type Box } from "@/lib/types";

const makeBox = (index: number): Box => {
  const category = BOX_CATEGORIES[index % BOX_CATEGORIES.length]!;
  const status = BOX_STATUSES[index % BOX_STATUSES.length]!;
  const userId = `usr-00${(index % 3) + 1}`;
  const id = `box-${String(index + 1).padStart(3, "0")}`;
  return {
    id,
    code: `BX-26${String(index + 1).padStart(4, "0")}`,
    userId,
    categoryId: category.id,
    status,
    dimensions: category.dimensions,
    weightLb: Math.max(12, category.maxWeightLb - (index % 4) * 5),
    originTracking: index % 4 === 0 ? undefined : `DEMO-ORIGEN-${1000 + index}`,
    receivedAt: index === 0 ? undefined : new Date(Date.UTC(2026, 7, 2 + (index % 24))).toISOString(),
    shipmentId: index >= 8 ? `ship-${String((index % 8) + 1).padStart(3, "0")}` : undefined,
    timeline: [
      { status: "pre-alertada", occurredAt: new Date(Date.UTC(2026, 7, 1 + (index % 20))).toISOString(), location: "Miami, FL", description: "Caja registrada para demostración." },
      ...(index === 0 ? [] : [{ status, occurredAt: new Date(Date.UTC(2026, 7, 2 + (index % 20))).toISOString(), location: status.includes("destino") || status === "entregada" ? "México" : "Miami, FL", description: "Actualización operativa simulada." }]),
    ],
  };
};

export const boxes: Box[] = Array.from({ length: 25 }, (_, index) => makeBox(index));
