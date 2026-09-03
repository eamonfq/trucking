import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { invoices } from "@/lib/data/invoices";
import { getSession } from "@/lib/auth/actions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const [session, { id }] = await Promise.all([getSession(), params]); if (!session) return new Response("No autorizado", { status: 401 }); const invoice = invoices.find((item) => item.id === id); if (!invoice) return new Response("Factura no encontrada", { status: 404 }); if (session.role !== "admin" && session.userId !== invoice.userId) return new Response("Prohibido", { status: 403 }); const buffer = await renderToBuffer(InvoiceDocument({ invoice })); return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.number}.pdf"` } }); }
