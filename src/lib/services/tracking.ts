import { boxes } from "@/lib/db/collections";
import { recipients } from "@/lib/db/collections";
import { shipments } from "@/lib/db/collections";
import { trucks } from "@/lib/db/collections";
import { clone, simulateLatency } from "@/lib/services/delay";
import { withStore } from "@/lib/db/store";
import type { Box, Shipment, Truck } from "@/lib/types";

type PublicBox = Pick<Box, "id" | "code" | "status" | "categoryId" | "categoryName" | "timeline">;
type PublicShipment = Pick<Shipment, "code" | "status" | "destinationCity" | "timeline">;
type PublicTruck = Pick<Truck, "code" | "status" | "destinationCity" | "timeline" | "boxIds">;
const publicEvents = <T extends { actor: string; note?: string }>(events: T[]) => events.map(event => ({ ...event, actor: "A&L", note: undefined }));
const publicBox = (box: Box): PublicBox => ({ id: box.code, code: box.code, status: box.status, categoryId: box.categoryId, categoryName:box.categoryName, timeline: publicEvents(box.timeline) });

export type TrackingResult =
  | { type: "box"; item: PublicBox; destinationCity?: string }
  | { type: "shipment"; item: PublicShipment; boxes: PublicBox[]; recipientFirstName: string }
  | { type: "truck"; item: PublicTruck }
  | null;

export async function trackByCode(rawCode: string): Promise<TrackingResult> {
  return withStore(async () => {
  await simulateLatency();
  const code = rawCode.trim().toUpperCase();
  if (code.startsWith("BX-")) {
    const item = boxes.find((box) => box.code === code);
    const shipment = item?.shipmentId ? shipments.find((candidate) => candidate.id === item.shipmentId) : undefined;
    return item ? clone({ type: "box" as const, item: publicBox(item), destinationCity: shipment?.destinationCity }) : null;
  }
  if (code.startsWith("SH-")) {
    const item = shipments.find((shipment) => shipment.code === code);
    if (!item) return null;
    const recipient = item.recipientSnapshot ?? recipients.find((candidate) => candidate.id === item.recipientId);
    return clone({ type: "shipment" as const, item: { code: item.code, status: item.status, destinationCity: item.destinationCity, timeline: publicEvents(item.timeline) }, boxes: boxes.filter((box) => item.boxIds.includes(box.id)).map(publicBox), recipientFirstName: recipient?.name.split(" ")[0] ?? "Destinatario" });
  }
  if (code.startsWith("TR-")) {
    const item = trucks.find((truck) => truck.code === code);
    return item ? clone({ type: "truck" as const, item: { code: item.code, status: item.status, destinationCity: item.destinationCity, timeline: publicEvents(item.timeline), boxIds: item.boxIds.map(() => "") } }) : null;
  }
  return null;
  });
}
