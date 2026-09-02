import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { invoices } from "@/lib/data/invoices";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const invoice = invoices.find((item) => item.id === id); if (!invoice) return new Response("Factura no encontrada", { status: 404 }); const buffer = await renderToBuffer(InvoiceDocument({ invoice })); return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.number}.pdf"` } }); }
