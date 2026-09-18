import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { logisticsService } from "@/lib/services/logistics";
import { getSession } from "@/lib/auth/actions";
import {ThermalDocument} from "@/lib/pdf/thermal-document";
import path from "node:path";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const [session, { id }] = await Promise.all([getSession(), params]); if (!session || session.role==="operador") return new Response("No autorizado", { status: 401 }); const invoice = (await logisticsService.getInvoices()).find(item => item.id === id); if (!invoice) return new Response("Factura no encontrada", { status: 404 }); const thermal=new URL(request.url).searchParams.get("formato")==="termico"; const buffer = await renderToBuffer(thermal?ThermalDocument({reference:invoice.number,invoices:[invoice],logoPath:path.join(process.cwd(),"public/brand/logoayl.png")}):InvoiceDocument({ invoice })); return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${thermal?"inline":"attachment"}; filename="${invoice.number}${thermal?"-80mm":""}.pdf"`, "Cache-Control": "private, no-store" } }); }
