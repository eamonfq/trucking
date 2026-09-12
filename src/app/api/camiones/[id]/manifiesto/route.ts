import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { ManifestDocument } from "@/lib/pdf/manifest-document";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (session?.role !== "admin") return new Response("No autorizado", { status: 401 });
  const [boxes, recipients, shipments, trucks, users] = await Promise.all([logisticsService.getBoxes(), logisticsService.getRecipients(), logisticsService.getShipments(), logisticsService.getTrucks(), logisticsService.getUsers()]);
  const truck = trucks.find((item) => item.id === id);
  if (!truck) return new Response("Camión no encontrado", { status: 404 });
  const truckBoxes = boxes.filter((box) => truck.boxIds.includes(box.id));
  const buffer = await renderToBuffer(ManifestDocument({ truck, boxes: truckBoxes, users, shipments, recipients }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="manifiesto-${truck.code}.pdf"` } });
}
