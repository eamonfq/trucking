import {readFile} from "node:fs/promises";
import path from "node:path";
import {getOperationalLocations} from "@/lib/auth/warehouse-actions";
import {withStore} from "@/lib/db/store";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/actions";
import {canAdmin} from "@/lib/auth/admin-permissions";
import { logisticsService } from "@/lib/services/logistics";
import { ManifestDocument } from "@/lib/pdf/manifest-document";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getCurrentUser(), params]);
  if (!canAdmin(session,"camiones")) return new Response("No autorizado", { status: 401 });
  const [boxes, recipients, shipments, trucks, users, locations] = await withStore(()=>Promise.all([logisticsService.getBoxes(), logisticsService.getRecipients(), logisticsService.getShipments(), logisticsService.getTrucks(), logisticsService.getUsers(),getOperationalLocations()]));
  const truck = trucks.find((item) => item.id === id);
  if (!truck) return new Response("Camión no encontrado", { status: 404 });
  const truckBoxes = boxes.filter((box) => truck.boxIds.includes(box.id));
  const logoSrc="data:image/png;base64,"+(await readFile(path.join(process.cwd(),"public/brand/logoayl.png"))).toString("base64");
  const buffer = await renderToBuffer(ManifestDocument({ truck, boxes: truckBoxes, users, shipments, recipients,warehouses:locations.warehouses,logoSrc }));
  return new Response(new Uint8Array(buffer), { headers: { "Cache-Control":"private, no-store", "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="bill-of-lading-${truck.code}.pdf"` } });
}
