import { boxes } from "@/lib/data/boxes";
import { recipients } from "@/lib/data/addresses";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { clone, simulateLatency } from "@/lib/services/delay";

export type TrackingResult =
  | { type: "box"; item: (typeof boxes)[number]; destinationCity?: string }
  | { type: "shipment"; item: (typeof shipments)[number]; boxes: typeof boxes; recipientFirstName: string }
  | { type: "truck"; item: (typeof trucks)[number] }
  | null;

export async function trackByCode(rawCode: string): Promise<TrackingResult> {
  await simulateLatency();
  const code = decodeURIComponent(rawCode).trim().toUpperCase();
  if (code.startsWith("BX-")) {
    const item = boxes.find((box) => box.code === code);
    const shipment = item?.shipmentId ? shipments.find((candidate) => candidate.id === item.shipmentId) : undefined;
    return item ? clone({ type: "box" as const, item, destinationCity: shipment?.destinationCity }) : null;
  }
  if (code.startsWith("SH-")) {
    const item = shipments.find((shipment) => shipment.code === code);
    if (!item) return null;
    const recipient = recipients.find((candidate) => candidate.id === item.recipientId);
    return clone({ type: "shipment" as const, item, boxes: boxes.filter((box) => item.boxIds.includes(box.id)), recipientFirstName: recipient?.name.split(" ")[0] ?? "Destinatario" });
  }
  if (code.startsWith("TR-")) {
    const item = trucks.find((truck) => truck.code === code);
    return item ? clone({ type: "truck" as const, item }) : null;
  }
  return null;
}
