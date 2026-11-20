import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/actions";
import { canAdmin } from "@/lib/auth/admin-permissions";
import { billsOfLading } from "@/lib/db/collections";
import { withStore } from "@/lib/db/store";
import { BillOfLadingDocument } from "@/lib/pdf/bill-of-lading-document";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getCurrentUser(), params]);
  if (!canAdmin(session, "camiones")) return new Response("No autorizado", { status: 401 });
  const bill = await withStore(async () => billsOfLading.find((item) => item.id === id));
  if (!bill) return new Response("Bill of lading no encontrado", { status: 404 });
  const buffer = await renderToBuffer(BillOfLadingDocument({ bill, code: bill.code }));
  const name = (bill.number || bill.code).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60) || bill.code;
  return new Response(new Uint8Array(buffer), { headers: { "Cache-Control": "private, no-store", "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="bill-of-lading-${name}.pdf"` } });
}
