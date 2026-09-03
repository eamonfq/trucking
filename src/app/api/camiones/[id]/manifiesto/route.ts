import { renderToBuffer } from "@react-pdf/renderer";
import { ManifestDocument } from "@/lib/pdf/manifest-document";
import { trucks } from "@/lib/data/trucks";
import { boxes } from "@/lib/data/boxes";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const truck = trucks.find((item) => item.id === id); if (!truck) return new Response("Camión no encontrado", { status: 404 }); const truckBoxes = boxes.filter((box) => truck.boxIds.includes(box.id)); const buffer = await renderToBuffer(ManifestDocument({ truck, boxes: truckBoxes })); return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="manifiesto-${truck.code}.pdf"` } }); }
