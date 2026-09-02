import Link from "next/link";
import { SectionTitle } from "@/components/cliente/section-title";
import { StatusBadge } from "@/components/ui/badge";
import { logisticsService } from "@/lib/services/logistics";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";

export default async function InvoicesPage() { const invoices = (await logisticsService.getInvoices()).filter((item) => item.userId === "usr-001"); return <><SectionTitle eyebrow="Cobros" title="Mis facturas" description="Cada línea representa una categoría de caja, nunca libras ni volumen." /><div className="mt-7 overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">Factura</th><th className="p-4">Emisión</th><th className="p-4">Estado</th><th className="p-4 text-right">Total</th></tr></thead><tbody className="divide-y divide-stone-200">{invoices.map((invoice) => <tr key={invoice.id}><td className="p-4"><Link href={`/cliente/facturas/${invoice.id}`} className="font-bold text-navy-950 hover:text-orange-600">{invoice.number}</Link></td><td className="p-4 text-navy-500">{formatDate(invoice.issuedAt)}</td><td className="p-4"><StatusBadge status={invoice.status} /></td><td className="p-4 text-right font-display font-bold text-navy-950">{formatUsd(invoiceTotal(invoice))}</td></tr>)}</tbody></table></div></>; }
