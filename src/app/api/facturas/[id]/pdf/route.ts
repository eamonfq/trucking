import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { logisticsService } from "@/lib/services/logistics";
import { getSession } from "@/lib/auth/actions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const [session, { id }] = await Promise.all([getSession(), params]); if (!session || session.role==="operador") return new Response("No autorizado", { status: 401 }); const invoice = (await logisticsService.getInvoices()).find(item => item.id === id); if (!invoice) return new Response("Factura no encontrada", { status: 404 }); const buffer = await renderToBuffer(InvoiceDocument({ invoice })); return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`, "Cache-Control": "private, no-store" } }); }
